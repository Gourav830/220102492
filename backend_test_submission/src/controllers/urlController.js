const Url = require("../models/urlModel");
const {
  validateShortenRequest,
  sanitizeUrl,
  generateShortCode,
  calculateExpiryDate,
  generateShortUrl,
  logUrlAccess,
} = require("../utils/helpers");

/**
 * Create a shortened URL
 */
const createShortUrl = async (req, res) => {
  try {
    // Validate request body
    const validation = validateShortenRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.errors,
      });
    }

    const { url, validity, shortcode } = req.body;

    // Sanitize and validate URL
    const sanitizedUrl = sanitizeUrl(url);

    // Set validity (default from environment or 30 minutes if not provided)
    const validityInMinutes =
      validity || process.env.DEFAULT_VALIDITY_MINUTES || 30;

    // Calculate expiry time
    const expiryDate = calculateExpiryDate(validityInMinutes);

    // Check if URL already exists and is not expired
    const existingUrl = await Url.findOne({ originalUrl: sanitizedUrl });
    if (existingUrl && existingUrl.isValidForRedirect()) {
      return res.json({
        shortLink: generateShortUrl(req, existingUrl.shortCode),
        expiry: existingUrl.expiry.toISOString(),
        message: "URL already shortened",
        existing: true,
      });
    }

    let shortCode;

    if (shortcode) {
      // Check if custom code already exists and is not expired
      const codeExists = await Url.findByShortCode(shortcode);
      if (codeExists && codeExists.isValidForRedirect()) {
        return res.status(400).json({
          error: "Custom shortcode already exists and is active",
        });
      }
      shortCode = shortcode;
    } else {
      // Generate unique short code
      let attempts = 0;
      const maxAttempts = 10;

      do {
        shortCode = await generateShortCode(process.env.SHORT_CODE_LENGTH || 5);
        attempts++;

        if (attempts >= maxAttempts) {
          throw new Error(
            "Unable to generate unique short code. Please try again."
          );
        }
      } while (await Url.findByShortCode(shortCode));
    }

    // Create new URL document
    const newUrl = new Url({
      originalUrl: sanitizedUrl,
      shortCode,
      validity: validityInMinutes,
      expiry: expiryDate,
    });

    await newUrl.save();

    // Return success response
    res.status(201).json({
      shortLink: generateShortUrl(req, shortCode),
      expiry: expiryDate.toISOString(),
      shortCode,
      originalUrl: sanitizedUrl,
      validity: validityInMinutes,
    });
  } catch (error) {
    console.error("Error creating short URL:", error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(409).json({
        error: "Short code already exists. Please try again.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation error",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }

    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Redirect to original URL
 */
const redirectToUrl = async (req, res) => {
  try {
    const { shortCode } = req.params;

    // Find URL by short code
    const url = await Url.findByShortCode(shortCode);

    if (!url) {
      return res.status(404).json({
        error: "Short URL not found",
        shortCode,
      });
    }

    // Check if URL is expired
    if (url.isExpired()) {
      return res.status(410).json({
        error: "Short URL has expired",
        shortCode,
        expiredAt: url.expiry,
      });
    }

    // Check if URL is active
    if (!url.isActive) {
      return res.status(410).json({
        error: "Short URL is no longer active",
        shortCode,
      });
    }

    // Increment click count and update last accessed
    await url.incrementClicks();

    // Log access for analytics
    logUrlAccess(url, req);

    // Redirect to original URL
    res.redirect(301, url.originalUrl);
  } catch (error) {
    console.error("Error redirecting to URL:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

/**
 * Get URL statistics
 */
const getUrlStats = async (req, res) => {
  try {
    const { shortCode } = req.params;

    const url = await Url.findByShortCode(shortCode);

    if (!url) {
      return res.status(404).json({
        error: "Short URL not found",
        shortCode,
      });
    }

    res.json({
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      clicks: url.clicks,
      validity: url.validity,
      expiry: url.expiry,
      isExpired: url.isExpired(),
      isActive: url.isActive,
      createdAt: url.createdAt,
      lastAccessed: url.lastAccessed,
      timeRemaining: url.timeRemaining,
    });
  } catch (error) {
    console.error("Error getting URL stats:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

/**
 * Get all URLs (admin functionality)
 */
const getAllUrls = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      includeExpired = false,
    } = req.query;

    // Build query
    const query = {};
    if (!includeExpired) {
      query.expiry = { $gt: new Date() };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const [urls, total] = await Promise.all([
      Url.find(query).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      Url.countDocuments(query),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      urls,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error("Error getting URLs:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

/**
 * Delete a short URL
 */
const deleteUrl = async (req, res) => {
  try {
    const { shortCode } = req.params;

    const deletedUrl = await Url.findOneAndDelete({ shortCode });

    if (!deletedUrl) {
      return res.status(404).json({
        error: "Short URL not found",
        shortCode,
      });
    }

    res.json({
      message: "Short URL deleted successfully",
      deletedUrl: {
        shortCode: deletedUrl.shortCode,
        originalUrl: deletedUrl.originalUrl,
        createdAt: deletedUrl.createdAt,
        clicks: deletedUrl.clicks,
      },
    });
  } catch (error) {
    console.error("Error deleting URL:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

/**
 * Update URL status (activate/deactivate)
 */
const updateUrlStatus = async (req, res) => {
  try {
    const { shortCode } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        error: "isActive must be a boolean value",
      });
    }

    const url = await Url.findOneAndUpdate(
      { shortCode },
      { isActive },
      { new: true }
    );

    if (!url) {
      return res.status(404).json({
        error: "Short URL not found",
        shortCode,
      });
    }

    res.json({
      message: `URL ${isActive ? "activated" : "deactivated"} successfully`,
      url: {
        shortCode: url.shortCode,
        originalUrl: url.originalUrl,
        isActive: url.isActive,
      },
    });
  } catch (error) {
    console.error("Error updating URL status:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

/**
 * Get API documentation
 */
const getApiDocs = (req, res) => {
  res.json({
    message: "URL Shortener API",
    version: "1.0.0",
    endpoints: {
      "POST /shorten": {
        description: "Create a short URL",
        body: {
          url: "string (required) - The original URL to shorten",
          validity: "number (optional) - Validity in minutes (default: 30)",
          shortcode: "string (optional) - Custom short code",
        },
      },
      "GET /:shortCode": {
        description: "Redirect to original URL",
        params: {
          shortCode: "string - The short code to redirect",
        },
      },
      "GET /api/stats/:shortCode": {
        description: "Get URL statistics",
        params: {
          shortCode: "string - The short code to get stats for",
        },
      },
      "GET /api/urls": {
        description: "Get all URLs with pagination",
        query: {
          page: "number (optional) - Page number (default: 1)",
          limit: "number (optional) - Items per page (default: 10)",
          sortBy: "string (optional) - Sort field (default: createdAt)",
          sortOrder: "string (optional) - Sort order: asc/desc (default: desc)",
          includeExpired:
            "boolean (optional) - Include expired URLs (default: false)",
        },
      },
      "DELETE /api/urls/:shortCode": {
        description: "Delete a short URL",
        params: {
          shortCode: "string - The short code to delete",
        },
      },
      "PATCH /api/urls/:shortCode/status": {
        description: "Update URL status (activate/deactivate)",
        params: {
          shortCode: "string - The short code to update",
        },
        body: {
          isActive: "boolean - New status",
        },
      },
    },
  });
};

module.exports = {
  createShortUrl,
  redirectToUrl,
  getUrlStats,
  getAllUrls,
  deleteUrl,
  updateUrlStatus,
  getApiDocs,
};
