const express = require('express');
const serverless = require('serverless-http');
const app = express();

app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    service: 'mkulima-market-api',
    database: 'supabase-pg',
    status: 'deployment scaffold ready'
  });
});

app.use('/api', (req, res) => {
  res.status(501).json({
    error: 'API migration in progress',
    message: 'This deployment scaffold is ready for the Supabase-backed backend. The full SQLite-to-Postgres migration is still being wired in.'
  });
});

module.exports = serverless(app);
