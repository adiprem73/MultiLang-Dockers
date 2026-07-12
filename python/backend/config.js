require("dotenv").config();

const bool = (value, fallback) => {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
};

const config = {
  PORT: Number(process.env.PORT || 5000),

  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,

  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  EXEC_TIMEOUT_MS: Number(process.env.EXEC_TIMEOUT_MS || 60_000),
  SESSION_IDLE_MS: Number(process.env.SESSION_IDLE_MS || 30 * 60 * 1000),

  IMAGES: {
    python: process.env.PYTHON_IMAGE || "python:3.11-slim",
    javascript: process.env.NODE_IMAGE || "node:22",
    cpp: process.env.CPP_IMAGE || "gcc:14",
    java: process.env.JAVA_IMAGE || "amazoncorretto:21",
  },

  CONTAINER_MEMORY: process.env.CONTAINER_MEMORY || "512m",
  CONTAINER_CPUS: process.env.CONTAINER_CPUS || "1",

  KERNEL_NETWORK: bool(process.env.KERNEL_NETWORK, true),
};

const missing = ["SUPABASE_URL", "SUPABASE_ANON_KEY"].filter(
  (key) => !config[key],
);

if (missing.length) {
  console.error(
    `Missing required environment variables: ${missing.join(", ")}.\n` +
      `Copy .env.example to .env and fill them in.`,
  );
  process.exit(1);
}

module.exports = config;
