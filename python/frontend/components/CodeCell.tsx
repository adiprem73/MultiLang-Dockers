"use client";

import Editor from "@monaco-editor/react";
import {useState} from "react";

const CodeCell = () => {

    const [language, setLanguage] = useState("python");

    const [code, setCode] = useState('print("hello world")');

    const [output, setOutput] = useState("");

    const [loading, setLoading] = useState(false);

    const runCode = async () => {
      try {
        setLoading(true);

        const response = await fetch("http://localhost:5000/execute", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            language,
            code,
          }),
        });

        const data = await response.json();

        if (data.output) {
          setOutput(data.output);
        }

        if (data.error) {
          setOutput(data.error);
        }
      } catch (error) {
        setOutput("Something went wrong");
      } finally {
        setLoading(false);
      }
    };
  return (
    <div className="border rounded-xl p-4 space-y-4">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="border px-3 py-2 rounded-lg"
      >
        <option value="python">Python</option>
        <option value="javascript">JavaScript</option>
        <option value="cpp">C++</option>
        <option value="java">Java</option>
      </select>

      <Editor
        height="300px"
        language={language}
        value={code}
        onChange={(value) => setCode(value || "")}
        theme="vs-dark"
      />
      <button
        onClick={runCode}
        className="bg-black text-white px-4 py-2 rounded-lg"
      >
        Run
      </button>

      <div className="bg-zinc-900 border border-zinc-700 text-green-400 p-4 rounded-lg min-h-[100px]">
        {loading ? "Running..." : output}
      </div>
    </div>
  );
};

export default CodeCell;
