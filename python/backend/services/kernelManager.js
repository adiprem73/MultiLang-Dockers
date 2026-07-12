const config = require("../config");
const { KernelSession, SUPPORTED } = require("./kernelSession");

/**
 * Owns every live kernel. Sessions are keyed by user *and* notebook, so two
 * notebooks get independent variable namespaces and no user can reach another
 * user's kernel by guessing a session id.
 */
const sessions = new Map();

const keyFor = (userId, sessionId, language) =>
  `${userId}::${sessionId}::${language}`;

const isPersistent = (language) => SUPPORTED.includes(language);

function getOrCreate(userId, sessionId, language) {
  const key = keyFor(userId, sessionId, language);

  let session = sessions.get(key);
  if (!session || session.disposed || session.status === "dead") {
    session = new KernelSession(language);
    sessions.set(key, session);
  }

  return session;
}

function run(userId, sessionId, language, code) {
  return getOrCreate(userId, sessionId, language).run(code);
}

async function restart(userId, sessionId, language) {
  const languages = language ? [language] : SUPPORTED;

  await Promise.all(
    languages.map(async (lang) => {
      const key = keyFor(userId, sessionId, lang);
      const session = sessions.get(key);
      if (!session) return;
      sessions.delete(key);
      await session.dispose();
    }),
  );
}

function interrupt(userId, sessionId, language) {
  const session = sessions.get(keyFor(userId, sessionId, language));
  if (!session) return false;
  return session.interrupt();
}

function status(userId, sessionId, language) {
  const session = sessions.get(keyFor(userId, sessionId, language));
  return session && !session.disposed ? session.status : "stopped";
}

function stats() {
  return { live: sessions.size };
}

async function disposeAll() {
  const all = [...sessions.values()];
  sessions.clear();
  await Promise.all(all.map((session) => session.dispose()));
}

// Reap idle kernels so abandoned browser tabs don't leave containers running.
const reaper = setInterval(() => {
  const cutoff = Date.now() - config.SESSION_IDLE_MS;

  for (const [key, session] of sessions) {
    if (session.status === "busy" || session.lastUsedAt > cutoff) continue;
    sessions.delete(key);
    session.dispose();
  }
}, 60_000);

reaper.unref();

module.exports = {
  run,
  restart,
  interrupt,
  status,
  stats,
  disposeAll,
  isPersistent,
};
