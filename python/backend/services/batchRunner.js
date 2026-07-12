const { spawn } = require("child_process");
const config = require("../config");

/**
 * One-shot compile-and-run for languages with no persistent session.
 *
 * The source is handed to the container base64-encoded in an environment
 * variable rather than through a mounted temp directory. That keeps stdin free,
 * needs no host filesystem at all (no temp files to leak, no Windows path
 * quoting to get wrong) and leaves nothing to clean up when a run is killed.
 */

const SCRIPTS = {
  cpp: () => `
set -u
echo "$CODE_B64" | base64 -d > /tmp/main.cpp
if ! g++ -O2 -std=c++20 -o /tmp/main /tmp/main.cpp; then
  exit 101
fi
exec /tmp/main
`,

  java: (className) => `
set -u
mkdir -p /tmp/src
echo "$CODE_B64" | base64 -d > /tmp/src/${className}.java
if ! javac -d /tmp/classes /tmp/src/${className}.java; then
  exit 101
fi
exec java -cp /tmp/classes ${className}
`,
};

// javac demands the filename match the public class, so take the name from the
// source instead of forcing everyone to call their class Main.
const javaClassName = (code) => {
  const match = code.match(
    /public\s+(?:final\s+|abstract\s+)?class\s+([A-Za-z_$][\w$]*)/,
  );
  return match ? match[1] : "Main";
};

const COMPILE_FAILED = 101;

function runBatch(language, code, timeoutMs = config.EXEC_TIMEOUT_MS) {
  const image = config.IMAGES[language];
  const script = SCRIPTS[language];

  if (!image || !script) {
    return Promise.reject(new Error(`Unsupported language: ${language}`));
  }

  const className = language === "java" ? javaClassName(code) : null;

  const args = [
    "run",
    "--rm",
    "-i",
    "--network=none",
    `--memory=${config.CONTAINER_MEMORY}`,
    `--cpus=${config.CONTAINER_CPUS}`,
    "--pids-limit=256",
    "-e",
    `CODE_B64=${Buffer.from(code).toString("base64")}`,
    image,
    "bash",
    "-c",
    script(className),
  ];

  return new Promise((resolve, reject) => {
    const child = spawn("docker", args);

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`Could not start Docker: ${error.message}`));
    });

    child.on("close", (exitCode) => {
      clearTimeout(timer);

      if (timedOut) {
        return reject(
          new Error(
            `Execution timed out after ${Math.round(timeoutMs / 1000)}s.`,
          ),
        );
      }

      resolve({
        status: exitCode === 0 ? "ok" : "error",
        stdout,
        stderr,
        result: null,
        compileError: exitCode === COMPILE_FAILED,
      });
    });

    // The program gets an immediately-closed stdin rather than an open pipe, so
    // a stray read() returns EOF instead of hanging until the timeout.
    child.stdin.end();
  });
}

module.exports = { runBatch, BATCH_LANGUAGES: Object.keys(SCRIPTS) };
