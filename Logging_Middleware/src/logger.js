const DEFAULT_ENDPOINT =
  process.env.LOG_ENDPOINT || "http://20.244.56.144/evaluation-service/logs";

const STACK_VALUES = new Set(["backend", "frontend"]);
const LEVEL_VALUES = new Set(["debug", "info", "warn", "error", "fatal"]);
const BOTH_PACKAGES = new Set([
  "component",
  "hook",
  "page",
  "state",
  "style",
  "auth",
  "config",
  "middleware",
  "utils",
]);
const BACKEND_ONLY = new Set([
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service",
]);
const FRONTEND_ONLY = new Set(["api"]);

function isValidPackage(stack, pkg) {
  if (BOTH_PACKAGES.has(pkg)) return true;
  if (stack === "backend") return BACKEND_ONLY.has(pkg);
  if (stack === "frontend") return FRONTEND_ONLY.has(pkg);
  return false;
}

async function postJson(url, body, { token } = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, data: await safeJson(res) };
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function Log(stack, level, pkg, message, options = {}) {
  if (!stack || !level || !pkg)
    throw new Error("stack, level, and package are required");
  const s = String(stack).toLowerCase();
  const l = String(level).toLowerCase();
  const p = String(pkg).toLowerCase();
  if (!STACK_VALUES.has(s)) throw new Error(`invalid stack: ${s}`);
  if (!LEVEL_VALUES.has(l)) throw new Error(`invalid level: ${l}`);
  if (!isValidPackage(s, p)) throw new Error(`invalid package for ${s}: ${p}`);
  const endpoint = options.endpoint || DEFAULT_ENDPOINT;
  const token = options.token || process.env.LOG_TOKEN;
  const payload = { stack: s, level: l, package: p, message };
  try {
    const res = await postJson(endpoint, payload, { token });
    if (!res.ok && !options.suppressErrors) {
      throw new Error(`Log post failed: ${res.status}`);
    }
    return res;
  } catch (err) {
    if (options.suppressErrors) return { ok: false, error: String(err) };
    throw err;
  }
}

export function createLogger({
  stack,
  package: pkg,
  endpoint = DEFAULT_ENDPOINT,
  defaultLevel = "info",
  defaultMeta,
} = {}) {
  if (!stack || !pkg)
    throw new Error("createLogger requires stack and package");
  const base = { stack, pkg, endpoint, defaultLevel, defaultMeta };
  const call = (level, message, extra = {}) =>
    Log(base.stack, level || base.defaultLevel, base.pkg, message, {
      endpoint: base.endpoint,
    });
  return {
    log: call,
    info: (msg, meta) => call("info", msg, meta),
    warn: (msg, meta) => call("warn", msg, meta),
    error: (msg, meta) => call("error", msg, meta),
    fatal: (msg, meta) => call("fatal", msg, meta),
  };
}
