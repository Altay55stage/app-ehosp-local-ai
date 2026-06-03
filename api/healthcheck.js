module.exports = (req, res) => {
  res.json({ ok: true, now: Date.now(), env: process.env.VERCEL_ENV || 'prod' });
};
