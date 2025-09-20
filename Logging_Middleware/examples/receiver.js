import http from "node:http";

const port = process.env.RECEIVER_PORT || 3001;

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/log") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        console.log("[RECEIVED LOG]", JSON.stringify(data));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: String(e) }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(port, () => {
  console.log(`Log receiver listening on http://localhost:${port}/log`);
});
