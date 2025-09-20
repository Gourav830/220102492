import React, { useState } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Snackbar,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import logger from "../utils/logger";

const UrlShortener = () => {
  const [urls, setUrls] = useState([]);
  const [currentUrl, setCurrentUrl] = useState("");
  const [validityPeriod, setValidityPeriod] = useState("");
  const [preferredShortcode, setPreferredShortcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSnackbar, setShowSnackbar] = useState(false);

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateInputs = () => {
    if (!currentUrl.trim()) {
      setError("URL is required");
      return false;
    }

    if (!isValidUrl(currentUrl)) {
      setError("Please enter a valid URL format");
      return false;
    }

    if (
      validityPeriod &&
      (!Number.isInteger(Number(validityPeriod)) || Number(validityPeriod) <= 0)
    ) {
      setError("Validity period must be a positive integer (in minutes)");
      return false;
    }

    if (
      preferredShortcode &&
      (!Number.isInteger(Number(preferredShortcode)) ||
        Number(preferredShortcode) <= 0)
    ) {
      setError("Preferred shortcode must be a positive integer");
      return false;
    }

    if (urls.length >= 5) {
      setError("Maximum 5 URLs can be shortened concurrently");
      return false;
    }

    return true;
  };

  const handleShortenUrl = async () => {
    setError("");
    setSuccess("");

    logger.logUserAction("url_shortening_attempt", {
      originalUrl: currentUrl,
      hasValidityPeriod: !!validityPeriod,
      hasPreferredShortcode: !!preferredShortcode,
    });

    if (!validateInputs()) {
      logger.warn("URL shortening validation failed", {
        originalUrl: currentUrl,
        validationErrors: error,
      });
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      logger.logApiRequest("POST", "http://localhost:4000/shorten", {
        url: currentUrl,
        validity: validityPeriod || null,
        shortcode: preferredShortcode || null,
      });

      const requestBody = {
        url: currentUrl,
        ...(validityPeriod && { validity: parseInt(validityPeriod) }),
        ...(preferredShortcode && {
          shortcode: parseInt(preferredShortcode),
        }),
      };

      const response = await fetch("http://localhost:4000/shorten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      logger.logApiResponse(
        "POST",
        "http://localhost:4000/shorten",
        response.status,
        data,
        duration
      );

      logger.info("URL shortened successfully", {
        originalUrl: currentUrl,
        shortenedUrl: data.shortLink,
        shortcode: data.shortCode,
        duration: `${duration}ms`,
      });

      const newUrl = {
        id: Date.now(),
        originalUrl: currentUrl,
        shortenedUrl: data.shortLink,
        shortcode: data.shortCode,
        validityPeriod: validityPeriod || "No expiry",
        createdAt: new Date().toLocaleString(),
      };

      setUrls((prevUrls) => [...prevUrls, newUrl]);
      setSuccess("URL shortened successfully!");

      logger.logStateChange(
        "UrlShortener",
        { urlCount: urls.length },
        { urlCount: urls.length + 1 }
      );

      setCurrentUrl("");
      setValidityPeriod("");
      setPreferredShortcode("");
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logApiResponse(
        "POST",
        "http://localhost:4000/shorten",
        0,
        { error: err.message },
        duration
      );
      logger.error("Error shortening URL", {
        error: err.message,
        originalUrl: currentUrl,
        duration: `${duration}ms`,
      });
      setError(`Failed to shorten URL: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    logger.logUserAction("copy_to_clipboard", { url: text });

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setSuccess("URL copied to clipboard!");
        setShowSnackbar(true);
        logger.info("URL copied to clipboard successfully", { url: text });
      })
      .catch((err) => {
        setError("Failed to copy to clipboard");
        logger.error("Failed to copy to clipboard", {
          error: err.message,
          url: text,
        });
      });
  };

  const deleteUrl = (id) => {
    const urlToDelete = urls.find((url) => url.id === id);
    logger.logUserAction("delete_url", {
      urlId: id,
      originalUrl: urlToDelete?.originalUrl,
    });

    setUrls((prevUrls) => prevUrls.filter((url) => url.id !== id));
    setSuccess("URL removed from list");
    setShowSnackbar(true);

    logger.logStateChange(
      "UrlShortener",
      { urlCount: urls.length },
      { urlCount: urls.length - 1 }
    );
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          align="center"
          color="primary"
        >
          URL Shortener
        </Typography>

        <Typography
          variant="h6"
          gutterBottom
          align="center"
          color="text.secondary"
          sx={{ mb: 4 }}
        >
          Shorten your URLs quickly and efficiently
        </Typography>

        <Box component="form" sx={{ mb: 4 }}>
          <TextField
            fullWidth
            label="Enter URL to shorten *"
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            placeholder="https://example.com/very-long-url"
            sx={{ mb: 2 }}
            variant="outlined"
          />

          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Validity Period (minutes)"
              type="number"
              value={validityPeriod}
              onChange={(e) => setValidityPeriod(e.target.value)}
              placeholder="Optional"
              sx={{ flex: 1 }}
              variant="outlined"
            />

            <TextField
              label="Preferred Shortcode"
              type="number"
              value={preferredShortcode}
              onChange={(e) => setPreferredShortcode(e.target.value)}
              placeholder="Optional integer"
              sx={{ flex: 1 }}
              variant="outlined"
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={handleShortenUrl}
            disabled={loading}
            fullWidth
            sx={{ py: 1.5 }}
          >
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                Shortening URL...
              </Box>
            ) : (
              "Shorten URL"
            )}
          </Button>
        </Box>

        {urls.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h5" gutterBottom color="primary">
              Shortened URLs ({urls.length}/5)
            </Typography>

            {urls.map((url) => (
              <Accordion key={url.id} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" noWrap>
                      {url.originalUrl}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="primary"
                      sx={{ fontWeight: "bold" }}
                    >
                      {url.shortenedUrl}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Original URL:</strong> {url.originalUrl}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Shortened URL:</strong> {url.shortenedUrl}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Shortcode:</strong> {url.shortcode}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Validity:</strong> {url.validityPeriod}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      <strong>Created:</strong> {url.createdAt}
                    </Typography>

                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ContentCopyIcon />}
                        onClick={() => copyToClipboard(url.shortenedUrl)}
                      >
                        Copy URL
                      </Button>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => deleteUrl(url.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </>
        )}
      </Paper>

      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSnackbar(false)}
        message={success}
      />
    </Container>
  );
};

export default UrlShortener;
