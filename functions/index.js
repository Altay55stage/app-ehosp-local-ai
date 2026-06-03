const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const Expo = require('expo-server-sdk').Expo;
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// Configure mail transport: prefer SMTP config from functions config or env vars
let transporter;
try {
  const smtp = (functions.config && functions.config().smtp) || {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  };
  if (smtp && (smtp.host || smtp.auth)) {
    transporter = nodemailer.createTransport(smtp);
    console.log('SMTP transporter configured');
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    console.log('Using jsonTransport fallback for emails');
  }
} catch (e) {
  transporter = nodemailer.createTransport({ jsonTransport: true });
  console.warn('Failed to configure SMTP transporter, using jsonTransport', e.message);
}

exports.sendAdminNotification = functions.https.onRequest(async (req, res) => {
  try {
    const { emailTo, subject, data } = req.body;
    const to = emailTo || 'altayinvestpro@gmail.com';
    const html = `<h3>${subject}</h3><pre>${JSON.stringify(data, null, 2)}</pre>`;

    const info = await transporter.sendMail({ from: 'no-reply@ehosp.app', to, subject, html });
    console.log('Admin notification sent', info);
    res.json({ ok: true });
  } catch (err) {
    console.error('sendAdminNotification error', err);
    res.status(500).json({ error: err.message });
  }
});

// Relay push to doctor via Expo push tokens stored in doctor profile
exports.sendDoctorNotification = functions.https.onRequest(async (req, res) => {
  try {
    const { doctorId, title, body, data, expoPushToken: providedToken } = req.body;
    if (!doctorId && !providedToken) return res.status(400).json({ error: 'doctorId or expoPushToken required' });

    let expoToken = providedToken;
    if (!expoToken) {
      // Try to read from Firestore if emulator is running; otherwise skip
      try {
        const docRef = db.collection('doctors').doc(doctorId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          const doctor = docSnap.data();
          expoToken = doctor.expoPushToken;
        }
      } catch (e) {
        console.warn('Firestore read failed or emulator not running; proceeding without Firestore:', e.message);
      }
    }

    if (!expoToken) return res.status(200).json({ ok: false, reason: 'no_push_token' });

    const expo = new Expo();
    const messages = [];
    if (!Expo.isExpoPushToken(expoToken)) {
      console.warn('Not an Expo push token:', expoToken);
    } else {
      messages.push({ to: expoToken, sound: 'default', title, body, data });
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    // Persist tickets for later receipt processing if Firestore is available
    let ticketDocId = null;
    try {
      const ticketDoc = await db.collection('pushTickets').add({ doctorId: doctorId || null, tickets, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      ticketDocId = ticketDoc.id;
    } catch (e) {
      console.warn('Could not persist push tickets to Firestore (emulator not running?), continuing:', e.message);
    }

    res.json({ ok: true, tickets, ticketDocId });
  } catch (err) {
    console.error('sendDoctorNotification error', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to check Expo push receipts for given ticket ids
exports.checkPushReceipts = functions.https.onRequest(async (req, res) => {
  try {
    const { ticketIds } = req.body;
    if (!ticketIds || !Array.isArray(ticketIds)) return res.status(400).json({ error: 'ticketIds array required' });

    const expo = new Expo();
    const receipts = await expo.getPushNotificationReceiptsAsync(ticketIds);

    // Persist receipts for auditing
    const batch = db.batch();
    const receiptsCol = db.collection('pushReceipts');
    Object.entries(receipts).forEach(([ticketId, receipt]) => {
      const docRef = receiptsCol.doc(ticketId);
      batch.set(docRef, { ticketId, receipt, checkedAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();

    res.json({ ok: true, receipts });
  } catch (err) {
    console.error('checkPushReceipts error', err);
    res.status(500).json({ error: err.message });
  }
});

// Optional: endpoint to convert html/pdf via third-party if needed
exports.healthcheck = functions.https.onRequest((req, res) => {
  res.json({ ok: true, now: Date.now() });
});
