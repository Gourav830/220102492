/**
 * Utility functions for URL shortener
 */

/**
 * Validate if a string is a valid URL
 * @param {string} string - The string to validate
 * @returns {boolean} - True if valid URL, false otherwise
 */
const isValidUrl = (string) => {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};

/**
 * Check if a date has expired
 * @param {Date} expiry - The expiry date to check
 * @returns {boolean} - True if expired, false otherwise
 */
const isExpired = (expiry) => {
  if (!expiry) return true;
  return new Date() > expiry;
};

/**
 * Generate a unique short code using nanoid
 * @param {number} length - Length of the short code (default from env or 5)
 * @returns {Promise<string>} - Generated short code
 */
const generateShortCode = async (
  length = process.env.SHORT_CODE_LENGTH || 5
) => {
  try {
    const { nanoid } = await import("nanoid");
    return nanoid(length);
  } catch (error) {
    console.error("Error generating short code:", error);
    // Fallback to simple random string if nanoid fails
    return generateFallbackShortCode(length);
  }
};

/**
 * Fallback short code generator (without nanoid)
 * @param {number} length - Length of the short code
 * @returns {string} - Generated short code
 */
const generateFallbackShortCode = (length = 5) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Calculate expiry date from validity in minutes
 * @param {number} validityInMinutes - Validity duration in minutes
 * @returns {Date} - Calculated expiry date
 */
const calculateExpiryDate = (validityInMinutes = 30) => {
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + validityInMinutes);
  return expiryDate;
};

/**
 * Validate short code format
 * @param {string} shortCode - The short code to validate
 * @returns {boolean} - True if valid format, false otherwise
 */
const isValidShortCode = (shortCode) => {
  if (!shortCode || typeof shortCode !== "string") return false;

  // Allow alphanumeric characters, hyphens, and underscores
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  const minLength = 3;
  const maxLength = 20;

  return (
    validPattern.test(shortCode) &&
    shortCode.length >= minLength &&
    shortCode.length <= maxLength
  );
};

/**
 * Sanitize URL input
 * @param {string} url - The URL to sanitize
 * @returns {string} - Sanitized URL
 */
const sanitizeUrl = (url) => {
  if (!url || typeof url !== "string") return "";

  // Trim whitespace
  url = url.trim();

  // Add protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    url = "http://" + url;
  }

  return url;
};

/**
 * Format time remaining until expiry
 * @param {Date} expiry - The expiry date
 * @returns {string} - Formatted time remaining
 */
const formatTimeRemaining = (expiry) => {
  if (isExpired(expiry)) return "Expired";

  const now = new Date();
  const diff = expiry.getTime() - now.getTime();

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

/**
 * Validate request body for URL shortening
 * @param {object} body - Request body
 * @returns {object} - Validation result with isValid and errors
 */
const validateShortenRequest = (body) => {
  const errors = [];
  const { url, validity, shortcode } = body;

  // Validate URL
  if (!url) {
    errors.push("URL is required");
  } else if (!isValidUrl(sanitizeUrl(url))) {
    errors.push("Please provide a valid URL");
  }

  // Validate validity
  if (validity !== undefined) {
    const validityNum = Number(validity);
    if (isNaN(validityNum) || validityNum < 1 || validityNum > 525600) {
      errors.push("Validity must be between 1 and 525600 minutes");
    }
  }

  // Validate custom shortcode
  if (shortcode !== undefined && !isValidShortCode(shortcode)) {
    errors.push(
      "Custom shortcode must be 3-20 characters long and contain only letters, numbers, hyphens, and underscores"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Generate full short URL
 * @param {object} req - Express request object
 * @param {string} shortCode - The short code
 * @returns {string} - Full short URL
 */
const generateShortUrl = (req, shortCode) => {
  return `${req.protocol}://${req.get("host")}/${shortCode}`;
};

/**
 * Log URL access for analytics
 * @param {object} urlDoc - URL document
 * @param {object} req - Express request object
 */
const logUrlAccess = (urlDoc, req) => {
  // In a production app, you might want to log more details
  console.log(`🔗 URL accessed: ${urlDoc.shortCode} -> ${urlDoc.originalUrl}`);
  console.log(`📊 Total clicks: ${urlDoc.clicks}`);

  // You could also log IP, user agent, etc. for analytics
  // const ip = req.ip || req.connection.remoteAddress;
  // const userAgent = req.get('User-Agent');
};

/**
 * Clean up expired URLs (utility for background jobs)
 * @param {object} UrlModel - URL model
 * @returns {Promise<number>} - Number of deleted URLs
 */
const cleanupExpiredUrls = async (UrlModel) => {
  try {
    const result = await UrlModel.deleteMany({
      expiry: { $lt: new Date() },
    });
    console.log(`🧹 Cleaned up ${result.deletedCount} expired URLs`);
    return result.deletedCount;
  } catch (error) {
    console.error("Error cleaning up expired URLs:", error);
    return 0;
  }
};

module.exports = {
  isValidUrl,
  isExpired,
  generateShortCode,
  generateFallbackShortCode,
  calculateExpiryDate,
  isValidShortCode,
  sanitizeUrl,
  formatTimeRemaining,
  validateShortenRequest,
  generateShortUrl,
  logUrlAccess,
  cleanupExpiredUrls,
};
