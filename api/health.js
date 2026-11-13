module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true, service: 'mkulima-market-api', database: 'supabase-pg' });
};
