const mongoose = require("mongoose");

/**
 * Database connection configuration
 */
const connectDatabase = async () => {
  try {
    const MONGODB_URI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/urlshortener";

    await mongoose.connect(MONGODB_URI);

    console.log("✅ Connected to MongoDB successfully");
    console.log(`📍 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

/**
 * Database disconnection
 */
const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error disconnecting from MongoDB:", error.message);
  }
};

/**
 * Handle database connection events
 */
mongoose.connection.on("connected", () => {
  console.log("🔗 Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("🔌 Mongoose disconnected from MongoDB");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await disconnectDatabase();
  process.exit(0);
});

module.exports = {
  connectDatabase,
  disconnectDatabase,
};
