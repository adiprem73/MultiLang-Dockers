const { exec, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const sessions = {};

const startSession = (sessionId) => {
  return new Promise((resolve) => {
    const js = spawn("docker", [
      "run",
      "--rm",
      "-i",
      "--name",
      `notebook_js_${sessionId}`,
      "-v",
      `${process.cwd()}/temp:/app`,
      "node",
      "node",
      "-e",
      `
const { createContext, runInContext } = require('vm');
const readline = require('readline');

const context = createContext({
  console,
  require,
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval,
  process,
});

const DELIMITER = '<<<END>>>';

const rl = readline.createInterface({ input: process.stdin });

rl.on('line', (line) => {
  const filePath = line.trim();
  const fs = require('fs');

  let output = '';
  const captured = [];

  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;

  console.log = (...args) => captured.push(args.map(String).join(' '));
  console.error = (...args) => captured.push(args.map(String).join(' '));
  console.warn = (...args) => captured.push(args.map(String).join(' '));

  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const result = runInContext(code, context);
    output = captured.join('\\n');
    if (output === '' && result !== undefined) {
      output = String(result);
    }
  } catch (err) {
    output = err.stack || err.message;
  } finally {
    console.log = origLog;
    console.error = origError;
    console.warn = origWarn;
  }

  process.stdout.write(output + DELIMITER);
});
`,
    ]);

    let buffer = "";
    const resolveQueue = [];

    js.stdout.on("data", (data) => {
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

    js.stderr.on("data", (data) => {
      console.error("JS session error:", data.toString());
    });

    js.on("exit", () => {
      delete sessions[sessionId];
    });

    sessions[sessionId] = { process: js, resolveQueue };
    resolve();
  });
};

const runJS = async (code, sessionId = "default") => {
  if (!sessions[sessionId]) {
    await startSession(sessionId);
  }

  return new Promise((resolve) => {
    const session = sessions[sessionId];

    // write code to a temp file, send just the file path via stdin
    const jobId = uuid();
    const fileName = `${jobId}.js`;
    const filePath = path.join(__dirname, "../temp", fileName);
    fs.writeFileSync(filePath, code);

    session.resolveQueue.push((output) => {
      fs.unlinkSync(filePath);
      resolve(output);
    });

    // just send the file path — no size encoding issues
    session.process.stdin.write(`/app/${fileName}\n`);
  });
};

const restartJSSession = (sessionId = "default") => {
  return new Promise((resolve) => {
    if (sessions[sessionId]) {
      sessions[sessionId].process.kill();
      delete sessions[sessionId];
    }
    exec(`docker rm -f notebook_js_${sessionId}`, () => resolve());
  });
};

module.exports = { runJS, restartJSSession };
