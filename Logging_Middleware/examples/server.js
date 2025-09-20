import express from "express";
import { requestLogger, errorLogger, Log } from "../dist/index.js";

const app = express();
app.use(express.json());
app.use(requestLogger({ endpoint: process.env.LOG_ENDPOINT }));

app.get("/ok", (req, res) => {
  res.json({ ok: true });
});

app.get("/boom", (req, res, next) => {
  next(new Error("simulated failure"));
});

app.use(errorLogger({ endpoint: process.env.LOG_ENDPOINT }));

const port = process.env.PORT || 4000;
app.listen(port, () => {
  Log("backend", "info", "service", `Example server listening on ${port}`, {
    endpoint: process.env.LOG_ENDPOINT,
    suppressErrors: true,
  });
  console.log(`Server listening on http://localhost:${port}`);
});
