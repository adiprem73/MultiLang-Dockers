const fs = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");
const { v4: uuid } = require("uuid");

// sessionId -> { process, outputBuffer, resolveQueue }
const sessions = {};

const startSession = (sessionId) => {
  return new Promise((resolve, reject) => {
    // single persistent python process per session
    const py = spawn("docker", [
      "run",
      "--rm",
      "-i",
      "--name",
      `notebook_${sessionId}`,
      "python:3.11",
      "python3",
      "-u",
      "-c",
      `
import sys, traceback
from io import StringIO

namespace = {}
DELIMITER = "<<<END>>>"

while True:
    size_line = sys.stdin.readline()
    if not size_line:
        break
    size = int(size_line.strip())
    code = sys.stdin.read(size)

    old_stdout = sys.stdout
    old_stderr = sys.stderr
    sys.stdout = StringIO()
    sys.stderr = StringIO()

    try:
        exec(compile(code, '<cell>', 'exec'), namespace)
        output = sys.stdout.getvalue()
        err = sys.stderr.getvalue()
        result = output + err
    except Exception:
        result = traceback.format_exc()
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr

    old_stdout.write(result + DELIMITER)
    old_stdout.flush()
`,
    ]);

    let buffer = "";
    const resolveQueue = [];

    py.stdout.on("data", (data) => {
      buffer += data.toString();
      while (buffer.includes("<<<END>>>")) {
        const idx = buffer.indexOf("<<<END>>>");
        const output = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 9);
        if (resolveQueue.length > 0) {
          const resolve = resolveQueue.shift();
          resolve(output);
        }
      }
    });

    py.stderr.on("data", (data) => {
      // startup errors
      console.error("Python session error:", data.toString());
    });

    py.on("exit", () => {
      delete sessions[sessionId];
    });

    sessions[sessionId] = { process: py, resolveQueue };
    resolve();
  });
};

const runPython = async (code, sessionId = "default") => {
  if (!sessions[sessionId]) {
    await startSession(sessionId);
  }

  return new Promise((resolve, reject) => {
    const session = sessions[sessionId];
    const encoded = Buffer.byteLength(code, "utf8");

    session.resolveQueue.push(resolve);

    // send size then code to the persistent python process
    session.process.stdin.write(`${encoded}\n`);
    session.process.stdin.write(code);
  });
};

const restartSession = (sessionId = "default") => {
  return new Promise((resolve) => {
    if (sessions[sessionId]) {
      sessions[sessionId].process.kill();
      delete sessions[sessionId];
    }
    // also kill docker container if still running
    exec(`docker rm -f notebook_${sessionId}`, () => resolve());
  });
};

module.exports = { runPython, restartSession };
