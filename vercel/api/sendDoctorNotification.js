const { Expo } = require('expo-server-sdk');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { expoPushToken, title, body, data } = req.body || {};
    if (!expoPushToken) return res.status(400).json({ error: 'expoPushToken required' });

    const expo = new Expo();
    const messages = [];
    if (!Expo.isExpoPushToken(expoPushToken)) {
      console.warn('Not an Expo push token:', expoPushToken);
    } else {
      messages.push({ to: expoPushToken, sound: 'default', title: title || 'Notification', body: body || '', data: data || {} });
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    res.json({ ok: true, tickets });
  } catch (err) {
    console.error('sendDoctorNotification error', err);
    res.status(500).json({ error: err.message });
  }
};
