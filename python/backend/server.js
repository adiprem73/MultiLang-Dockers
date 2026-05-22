const express = require("express");
const cors = require("cors");

const {
  runPython,
  restartSession: restartPythonSession,
} = require("./services/pythonRunner");
const { runJS, restartJSSession } = require("./services/jsRunner");
const  runCpp = require("./services/cppRunner");
const runJava = require("./services/javaRunner");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/execute", async (req, res) => {
  // const { language, code } = req.body;
  const { language, code, session_id = "default" } = req.body;

  try {
    let output;

    if (language === "python") {
      output = await runPython(code, session_id);
    }
    if (language === "javascript") {
      output = await runJS(code, session_id);
    }
    if (language === "cpp") {
      output = await runCpp(code);
    }
    if (language === "java") {
      output = await runJava(code);
    }

    res.json({
      output,
    });
  } catch (err) {
    res.status(500).json({
      error: err,
    });
  }
});

app.post("/restart", async (req, res) => {
  const { session_id = "default" } = req.body;
  await restartPythonSession(session_id);
  await restartJSSession(session_id);
  res.json({ success: true });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
