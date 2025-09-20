# URL Shortener API

URL shortener service built with Node.js, Express, and MongoDB.

## Installation

```bash
npm install
npm start
```

## Environment Variables

Set these in .env file:

- PORT
- MONGODB_URI
- NODE_ENV

## API Endpoints

- GET / - API documentation
- POST /shorten - Create short URL
- GET /:shortCode - Redirect to original URL
- GET /api/stats/:shortCode - Get URL statistics
- GET /api/urls - List all URLs
- DELETE /api/urls/:shortCode - Delete URL
- PATCH /api/urls/:shortCode/status - Update URL status
