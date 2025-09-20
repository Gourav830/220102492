import { Log } from "./logger.js";

export function requestLogger({
  stack = "backend",
  package: pkg = "route",
  endpoint,
  level = "info",
} = {}) {
  return async (req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      const message = `${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`;
      Log(stack, level, pkg, message, {
        endpoint,
      }).catch(() => {});
    });
    next();
  };
}

export function errorLogger({
  stack = "backend",
  package: pkg = "handler",
  endpoint,
  level = "error",
} = {}) {
  return (err, req, res, next) => {
    const message = err && err.message ? err.message : "Unhandled error";
    Log(stack, level, pkg, message, {
      endpoint,
    }).catch(() => {});
    next(err);
  };
}
