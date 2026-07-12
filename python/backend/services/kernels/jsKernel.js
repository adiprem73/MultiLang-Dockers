/**
 * Bootstrap program for the JavaScript kernel container.
 *
 * Same base64-JSON-per-line framing as the Python kernel. `vm.runInContext`
 * keeps `var`/`let`/`const`/function declarations alive in the context's global
 * lexical scope between cells, which is what gives us Jupyter-style persistence.
 */
module.exports = String.raw`
const vm = require("vm");
const readline = require("readline");

const sandbox = {
  console,
  require,
  process,
  Buffer,
  setTimeout,
  setInterval,
  setImmediate,
  clearTimeout,
  clearInterval,
  clearImmediate,
  URL,
  TextEncoder,
  TextDecoder,
  fetch,
};
sandbox.globalThis = sandbox;

const context = vm.createContext(sandbox);

const format = (value) => {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack || String(value);
  try {
    return require("util").inspect(value, { depth: 4, colors: false });
  } catch {
    return String(value);
  }
};

// Top-level await needs an async wrapper, but a wrapper would scope away any
// declarations the cell makes. Promote top-level declarations to the shared
// context first so they survive.
const hasTopLevelAwait = (code) => /(^|[^\w.])await\s/.test(code);

const hoistDeclarations = (code) =>
  code
    .split("\n")
    .map((line) =>
      line.replace(
        /^(\s*)(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/,
        (_match, indent, name) => indent + "globalThis." + name + " =",
      ),
    )
    .join("\n");

async function execute(code) {
  const stdout = [];
  const stderr = [];

  const original = {
    log: console.log,
    info: console.info,
    debug: console.debug,
    warn: console.warn,
    error: console.error,
  };

  // Braces matter: console.log must return undefined, or its return value
  // becomes the cell's completion value and gets echoed as a result.
  const capture = (sink) =>
    (...args) => {
      sink.push(args.map(format).join(" "));
    };

  console.log = capture(stdout);
  console.info = capture(stdout);
  console.debug = capture(stdout);
  console.warn = capture(stderr);
  console.error = capture(stderr);

  let status = "ok";
  let result = null;

  try {
    const source = hasTopLevelAwait(code)
      ? "(async () => {\n" + hoistDeclarations(code) + "\n})()"
      : code;

    let value = vm.runInContext(source, context, {
      filename: "<cell>",
      displayErrors: true,
    });

    if (value && typeof value.then === "function") {
      value = await value;
    }

    if (value !== undefined) {
      result = format(value);
    }
  } catch (error) {
    status = "error";
    stderr.push(error && error.stack ? error.stack : String(error));
  } finally {
    Object.assign(console, original);
  }

  return {
    status,
    stdout: stdout.length ? stdout.join("\n") + "\n" : "",
    stderr: stderr.length ? stderr.join("\n") + "\n" : "",
    result,
  };
}

const rl = readline.createInterface({ input: process.stdin });

// Serialise cells: a queue keeps outputs matched to the request that caused them.
let queue = Promise.resolve();

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  queue = queue.then(async () => {
    let request;
    try {
      request = JSON.parse(Buffer.from(trimmed, "base64").toString());
    } catch {
      return;
    }

    const response = await execute(request.code || "");
    response.id = request.id;

    process.stdout.write(
      Buffer.from(JSON.stringify(response)).toString("base64") + "\n",
    );
  });
});
`;
