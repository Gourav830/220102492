import { Log, createLogger } from "../dist/index.js";

async function run() {
  console.log("Sending sample logs...");
  await Log("backend", "error", "handler", "received string, expected bool", {
    endpoint: process.env.LOG_ENDPOINT,
  });
  await Log("backend", "fatal", "db", "critical database connection failure.", {
    endpoint: process.env.LOG_ENDPOINT,
  });

  const logger = createLogger({
    stack: "backend",
    package: "service",
    endpoint: process.env.LOG_ENDPOINT,
  });
  await logger.info("order created", { orderId: 123 });
  console.log("Done");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
