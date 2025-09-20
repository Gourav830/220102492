const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { connectDatabase } = require("./src/config/database");
const {
  errorHandler,
  notFoundHandler,
  requestLogger,
  corsConfig,
  securityHeaders,
  validateRequest,
} = require("./src/middleware/errorHandler");
const urlRoutes = require("./src/routes/urlRoutes");

const app = express();
const PORT = process.env.PORT || 4000;

const initializeApp = async () => {
  app.use(securityHeaders);
  app.use(cors(corsConfig));

  if (process.env.NODE_ENV === "development") {
    app.use(requestLogger);
    try {
      const loggingMiddleware = await import("logging-middleware");
      app.use(
        loggingMiddleware.requestLogger({
          stack: "url-shortener-backend",
          package: "express-server",
          level: "info",
        })
      );
      console.log("✅ Logging middleware loaded successfully");
    } catch (loggingError) {
      console.warn(
        "⚠️  Logging middleware not available:",
        loggingError.message
      );
    }
  }

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(validateRequest.json);
  app.use("/", urlRoutes);
  app.use(notFoundHandler);

  try {
    const loggingMiddleware = await import("logging-middleware");
    app.use(
      loggingMiddleware.errorLogger({
        stack: "url-shortener-backend",
        package: "express-server",
        level: "error",
      })
    );
  } catch (loggingError) {}

  app.use(errorHandler);
};

const startServer = async () => {
  try {
    await initializeApp();
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📋 API Documentation available at http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("\n📡 Available Endpoints:");
      console.log(`   GET  /                           - API Documentation`);
      console.log(`   POST /shorten                    - Create Short URL`);
      console.log(`   GET  /:shortCode                 - Redirect to URL`);
      console.log(`   GET  /api/stats/:shortCode       - URL Statistics`);
      console.log(`   GET  /api/urls                   - List All URLs`);
      console.log(`   DELETE /api/urls/:shortCode      - Delete URL`);
      console.log(`   PATCH /api/urls/:shortCode/status - Update URL Status`);
      console.log("\n URL Shortener is ready to use!");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});

startServer();
module.exports = app;
