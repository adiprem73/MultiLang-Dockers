/**
 * Bootstrap program for the Python kernel container.
 *
 * Framing: one base64-encoded JSON object per line, in both directions. User
 * code can print anything it likes (including our delimiters) without being
 * able to corrupt the protocol, because everything it writes is captured into
 * a StringIO rather than the real stdout.
 *
 * Request:  { "id": "...", "code": "..." }
 * Response: { "id": "...", "status": "ok"|"error", "stdout", "stderr", "result" }
 */
module.exports = String.raw`
import sys, json, base64, io, ast, traceback, builtins, subprocess, contextlib

namespace = {"__name__": "__main__"}


def _blocked_input(*args, **kwargs):
    raise RuntimeError(
        "input() is not supported in notebook cells. "
        "Assign the value directly instead."
    )


def _shell(command):
    """Backs the !command magic. Output is captured, never written to fd 1."""
    completed = subprocess.run(
        command,
        shell=True,
        capture_output=True,
        text=True,
    )
    if completed.stdout:
        sys.stdout.write(completed.stdout)
    if completed.stderr:
        sys.stderr.write(completed.stderr)
    return None


builtins.input = _blocked_input
namespace["__shell__"] = _shell


def expand_magics(code):
    """Rewrite lines starting with ! into __shell__(...) calls."""
    lines = []
    for line in code.split("\n"):
        stripped = line.lstrip()
        if stripped.startswith("!"):
            indent = line[: len(line) - len(stripped)]
            lines.append(indent + "__shell__(" + repr(stripped[1:]) + ")")
        else:
            lines.append(line)
    return "\n".join(lines)


def format_error():
    """Traceback with our own exec frame stripped, so it reads like Jupyter's."""
    exc_type, exc_value, tb = sys.exc_info()
    user_tb = tb.tb_next if tb is not None else None
    return "".join(traceback.format_exception(exc_type, exc_value, user_tb))


def execute(code):
    stdout, stderr = io.StringIO(), io.StringIO()
    result = None
    status = "ok"

    try:
        tree = ast.parse(expand_magics(code), "<cell>", "exec")
    except SyntaxError:
        exc_type, exc_value, _ = sys.exc_info()
        return {
            "status": "error",
            "stdout": "",
            "stderr": "".join(traceback.format_exception_only(exc_type, exc_value)),
            "result": None,
        }

    # Jupyter displays the value of a trailing expression; split it off and eval
    # it separately so we can capture its repr.
    trailing = None
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        trailing = ast.Expression(tree.body[-1].value)
        ast.copy_location(trailing, tree.body[-1])
        tree.body = tree.body[:-1]

    try:
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            exec(compile(tree, "<cell>", "exec"), namespace)
            if trailing is not None:
                value = eval(compile(trailing, "<cell>", "eval"), namespace)
                if value is not None:
                    result = repr(value)
    except SystemExit:
        pass
    except KeyboardInterrupt:
        status = "error"
        stderr.write("KeyboardInterrupt: execution interrupted\n")
    except BaseException:
        status = "error"
        stderr.write(format_error())

    return {
        "status": status,
        "stdout": stdout.getvalue(),
        "stderr": stderr.getvalue(),
        "result": result,
    }


def main():
    real_stdout = sys.stdout
    while True:
        # readline rather than iteration: iteration read-aheads would stall the
        # kernel until the buffer filled, which never happens for one cell.
        line = sys.stdin.readline()
        if not line:
            break

        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(base64.b64decode(line))
        except Exception:
            continue

        response = execute(request.get("code", ""))
        response["id"] = request.get("id")

        payload = base64.b64encode(json.dumps(response).encode()).decode()
        real_stdout.write(payload + "\n")
        real_stdout.flush()


main()
`;
