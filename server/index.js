// Express entry point — clean setup, mounts routes, serves React build

const express = require('express');
const path = require('path');

const PORT = process.env.PORT || 4545;
const REACT_DIST = path.join(__dirname, '..', 'client', 'dist');

const app = express();
app.use(express.json({ limit: '2mb' }));

// API routes
app.use('/api', require('./routes/gitlab'));

// API 404 fallback — return JSON error instead of SPA HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}. Please restart the server.` });
});

// Serve React build (SPA)
app.use(express.static(REACT_DIST, {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// SPA fallback — serve index.html for any non-API route
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(REACT_DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`GitLab Version Tracker running on http://localhost:${PORT}`);
});