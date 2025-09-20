const express = require("express");
const {
  createShortUrl,
  redirectToUrl,
  getUrlStats,
  getAllUrls,
  deleteUrl,
  updateUrlStatus,
  getApiDocs,
} = require("../controllers/urlController");

const router = express.Router();

/**
 * @route   GET /
 * @desc    Get API documentation
 * @access  Public
 */
router.get("/", getApiDocs);

/**
 * @route   POST /shorten
 * @desc    Create a shortened URL
 * @access  Public
 * @body    { url, validity?, shortcode? }
 */
router.post("/shorten", createShortUrl);

/**
 * @route   GET /:shortCode
 * @desc    Redirect to original URL
 * @access  Public
 * @params  shortCode
 */
router.get("/:shortCode", redirectToUrl);

/**
 * API Routes (prefixed with /api)
 */

/**
 * @route   GET /api/stats/:shortCode
 * @desc    Get URL statistics
 * @access  Public
 * @params  shortCode
 */
router.get("/api/stats/:shortCode", getUrlStats);

/**
 * @route   GET /api/urls
 * @desc    Get all URLs with pagination and filtering
 * @access  Public (consider adding authentication for production)
 * @query   page?, limit?, sortBy?, sortOrder?, includeExpired?
 */
router.get("/api/urls", getAllUrls);

/**
 * @route   DELETE /api/urls/:shortCode
 * @desc    Delete a short URL
 * @access  Public (consider adding authentication for production)
 * @params  shortCode
 */
router.delete("/api/urls/:shortCode", deleteUrl);

/**
 * @route   PATCH /api/urls/:shortCode/status
 * @desc    Update URL status (activate/deactivate)
 * @access  Public (consider adding authentication for production)
 * @params  shortCode
 * @body    { isActive }
 */
router.patch("/api/urls/:shortCode/status", updateUrlStatus);

module.exports = router;
