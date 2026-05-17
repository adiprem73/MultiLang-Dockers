const express = require("express");
const cors = require("cors");

const runPython = require("./services/pythonRunner");
const runJS = require("./services/jsRunner");
const  runCpp = require("./services/cppRunner");
const runJava = require("./services/javaRunner");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/execute", async (req, res) => {
  const { language, code } = req.body;

  try {
    let output;

    if (language === "python") {
      output = await runPython(code);
    }
    if (language === "javascript") {
      output = await runJS(code);
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

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
