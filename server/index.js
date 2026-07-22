// Express entry point — clean setup, mounts routes, serves React build

const express = require('express');
const path = require('path');

const PORT = process.env.PORT || 4545;
const REACT_DIST = path.join(__dirname, '..', 'client', 'dist');

const app = express();
app.use(express.json({ limit: '2mb' }));

// API routes
app.use('/api', require('./routes/gitlab'));

// Serve React build (SPA)
app.use(express.static(REACT_DIST));

// SPA fallback — serve index.html for any non-API route
app.get('*', (_req, res) => {
  res.sendFile(path.join(REACT_DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`GitLab Version Tracker running on http://localhost:${PORT}`);
});