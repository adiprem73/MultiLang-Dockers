const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");
const config = require("../config");

// supabase-js always builds a realtime client, which needs a WebSocket. Node 20
// has no global one, so hand it `ws` explicitly — otherwise createClient throws
// at startup. (We never actually open a realtime channel.)
const OPTIONS = {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
};

// Used only to verify tokens — never to read user data.
const authClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY,
  OPTIONS,
);

/**
 * A Supabase client that acts *as the signed-in user*, so Postgres row level
 * security applies to every query. The explicit `user_id` filters in the routes
 * are then defence in depth rather than the only thing standing between two
 * users' notebooks.
 */
const clientForUser = (token) =>
  createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    ...OPTIONS,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid auth token" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const { data, error } = await authClient.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = data.user;
    req.token = token;
    req.supabase = clientForUser(token);
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAuth };
