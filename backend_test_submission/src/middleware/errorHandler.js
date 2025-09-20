/**
 * Error handling middleware for URL Shortener API
 */

/**
 * Global error handling middleware
 * This should be the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
  console.error("🚨 Error occurred:", err);

  // Default error response
  let error = {
    message: err.message || "Internal Server Error",
    status: err.status || err.statusCode || 500,
  };

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((error) => error.message);
    error = {
      message: "Validation Error",
      status: 400,
      details: messages,
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = {
      message: `Duplicate value for ${field}`,
      status: 409,
      field,
    };
  }

  // Mongoose CastError
  if (err.name === "CastError") {
    error = {
      message: "Invalid ID format",
      status: 400,
    };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = {
      message: "Invalid token",
      status: 401,
    };
  }

  if (err.name === "TokenExpiredError") {
    error = {
      message: "Token expired",
      status: 401,
    };
  }

  // MongoDB connection errors
  if (err.name === "MongoNetworkError" || err.name === "MongoTimeoutError") {
    error = {
      message: "Database connection error",
      status: 503,
    };
  }

  // Rate limiting error
  if (err.status === 429) {
    error = {
      message: "Too many requests, please try again later",
      status: 429,
    };
  }

  // Don't expose error details in production
  if (process.env.NODE_ENV === "production" && error.status === 500) {
    error.message = "Internal Server Error";
    delete error.details;
  }

  res.status(error.status).json({
    error: error.message,
    ...(error.details && { details: error.details }),
    ...(error.field && { field: error.field }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: "Route not found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      "GET /": "API documentation",
      "POST /shorten": "Create short URL",
      "GET /:shortCode": "Redirect to original URL",
      "GET /api/stats/:shortCode": "Get URL statistics",
      "GET /api/urls": "Get all URLs",
      "DELETE /api/urls/:shortCode": "Delete URL",
      "PATCH /api/urls/:shortCode/status": "Update URL status",
    },
  });
};

/**
 * Async error wrapper
 * Wraps async functions to catch errors and pass them to error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Override res.end to log response time
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`
    );
    originalEnd.apply(this, args);
  };

  next();
};

/**
 * CORS configuration middleware
 */
const corsConfig = {
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

/**
 * Rate limiting configuration
 */
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.API_RATE_LIMIT || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader("X-Powered-By");

  // Set security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  next();
};

/**
 * Request validation middleware
 */
const validateRequest = {
  /**
   * Validate JSON body size and format
   */
  json: (req, res, next) => {
    if (
      req.headers["content-type"] &&
      req.headers["content-type"].includes("application/json")
    ) {
      if (
        req.headers["content-length"] &&
        parseInt(req.headers["content-length"]) > 1048576
      ) {
        // 1MB
        return res.status(413).json({
          error: "Request body too large",
          maxSize: "1MB",
        });
      }
    }
    next();
  },

  /**
   * Validate URL parameters
   */
  shortCode: (req, res, next) => {
    const { shortCode } = req.params;

    if (shortCode && !/^[a-zA-Z0-9_-]+$/.test(shortCode)) {
      return res.status(400).json({
        error: "Invalid short code format",
        message:
          "Short code can only contain letters, numbers, hyphens, and underscores",
      });
    }

    next();
  },
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestLogger,
  corsConfig,
  rateLimitConfig,
  securityHeaders,
  validateRequest,
};
