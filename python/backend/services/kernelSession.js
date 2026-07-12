const { spawn, exec } = require("child_process");
const crypto = require("crypto");

const config = require("../config");
const pythonKernel = require("./kernels/pythonKernel");
const jsKernel = require("./kernels/jsKernel");

const KERNELS = {
  python: {
    image: () => config.IMAGES.python,
    command: (script) => ["python3", "-u", "-c", script],
    script: pythonKernel,
    // Python raises KeyboardInterrupt on SIGINT, so a runaway loop can be
    // interrupted without losing the variables defined in earlier cells.
    interruptible: true,
  },
  javascript: {
    image: () => config.IMAGES.javascript,
    command: (script) => ["node", "-e", script],
    script: jsKernel,
    // A synchronous loop in V8 cannot be interrupted; restarting is the only
    // way out, which necessarily clears state.
    interruptible: false,
  },
};

class KernelSession {
  constructor(language) {
    const spec = KERNELS[language];
    if (!spec) throw new Error(`No kernel for language: ${language}`);

    this.language = language;
    this.spec = spec;
    this.containerName = `notebook_${language}_${crypto.randomUUID()}`;
    this.pending = new Map();
    this.queue = Promise.resolve();
    this.buffer = "";
    this.status = "starting";
    this.lastUsedAt = Date.now();
    this.disposed = false;

    this.#spawn();
  }

  #spawn() {
    const args = [
      "run",
      "--rm",
      "-i",
      "--name",
      this.containerName,
      `--memory=${config.CONTAINER_MEMORY}`,
      `--cpus=${config.CONTAINER_CPUS}`,
      "--pids-limit=256",
    ];

    if (!config.KERNEL_NETWORK) args.push("--network=none");

    args.push(this.spec.image(), ...this.spec.command(this.spec.script));

    this.process = spawn("docker", args);
    this.status = "idle";

    this.process.stdout.on("data", (chunk) => this.#onStdout(chunk));

    this.process.stderr.on("data", (chunk) => {
      // The container's own stderr only carries infrastructure noise (image
      // pull progress, docker warnings). Cell stderr arrives over the protocol.
      const text = chunk.toString().trim();
      if (text) console.error(`[${this.containerName}] ${text}`);
    });

    this.process.on("exit", (code) => {
      this.#failAllPending(
        new Error(
          `Kernel exited (code ${code}). It may have run out of memory. ` +
            `The kernel has been reset — variables from earlier cells are gone.`,
        ),
      );
      this.status = "dead";
    });

    this.process.on("error", (error) => {
      this.#failAllPending(
        new Error(
          `Could not start the ${this.language} kernel: ${error.message}. ` +
            `Is Docker running?`,
        ),
      );
      this.status = "dead";
    });
  }

  #onStdout(chunk) {
    this.buffer += chunk.toString();

    let newline;
    while ((newline = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (!line) continue;

      let response;
      try {
        response = JSON.parse(Buffer.from(line, "base64").toString());
      } catch {
        continue;
      }

      const waiter = this.pending.get(response.id);
      if (!waiter) continue;

      this.pending.delete(response.id);
      clearTimeout(waiter.timer);
      waiter.resolve(response);
    }
  }

  #failAllPending(error) {
    for (const waiter of this.pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.pending.clear();
  }

  /** Cells run one at a time, in submission order — like a real notebook. */
  run(code, timeoutMs = config.EXEC_TIMEOUT_MS) {
    this.lastUsedAt = Date.now();

    const result = this.queue.then(() => this.#runNow(code, timeoutMs));

    // Keep the chain alive even when a cell fails, so the next cell still runs.
    this.queue = result.catch(() => {});

    return result;
  }

  #runNow(code, timeoutMs) {
    if (this.disposed || this.status === "dead") {
      return Promise.reject(new Error("Kernel is not running. Restart it."));
    }

    const id = crypto.randomUUID();
    this.status = "busy";

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.#onTimeout(timeoutMs).then(() =>
          reject(
            new Error(
              `Execution timed out after ${Math.round(timeoutMs / 1000)}s.`,
            ),
          ),
        );
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });

      const payload = Buffer.from(JSON.stringify({ id, code })).toString(
        "base64",
      );

      this.process.stdin.write(payload + "\n", (error) => {
        if (!error) return;
        this.pending.delete(id);
        clearTimeout(timer);
        reject(new Error(`Kernel is not accepting input: ${error.message}`));
      });
    }).finally(() => {
      if (this.status === "busy") this.status = "idle";
      this.lastUsedAt = Date.now();
    });
  }

  async #onTimeout() {
    // Try the gentle option first: SIGINT leaves a Python kernel alive with its
    // variables intact. Anything else has to be killed.
    if (this.spec.interruptible) {
      this.interrupt();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (this.status !== "dead") return;
    }
    await this.dispose();
  }

  interrupt() {
    if (!this.spec.interruptible || this.disposed) return false;
    exec(`docker kill -s INT ${this.containerName}`, () => {});
    return true;
  }

  dispose() {
    if (this.disposed) return Promise.resolve();
    this.disposed = true;
    this.status = "dead";

    this.#failAllPending(new Error("Kernel was shut down."));

    return new Promise((resolve) => {
      this.process?.kill();
      // --rm usually cleans up, but a wedged container needs a nudge.
      exec(`docker rm -f ${this.containerName}`, () => resolve());
    });
  }
}

module.exports = { KernelSession, SUPPORTED: Object.keys(KERNELS) };
