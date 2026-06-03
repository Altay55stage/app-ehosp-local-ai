const { Expo } = require('expo-server-sdk');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { ticketIds } = req.body || {};
    if (!ticketIds || !Array.isArray(ticketIds)) return res.status(400).json({ error: 'ticketIds array required' });

    const expo = new Expo();
    const receipts = await expo.getPushNotificationReceiptsAsync(ticketIds);

    res.json({ ok: true, receipts });
  } catch (err) {
    console.error('checkPushReceipts error', err);
    res.status(500).json({ error: err.message });
  }
};
