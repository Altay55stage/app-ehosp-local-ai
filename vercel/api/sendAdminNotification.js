let transporter = null;

function createTransporterIfAvailable() {
  if (transporter) return transporter;
  try {
    // eslint-disable-next-line global-require
    const nodemailer = require('nodemailer');
    const smtp = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    };
    if (smtp.host || smtp.auth) {
      transporter = nodemailer.createTransport(smtp);
      return transporter;
    }
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  } catch (e) {
    console.warn('nodemailer not available in runtime, falling back to console logging');
    transporter = null;
    return null;
  }
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { emailTo, subject, data } = req.body || {};
    const to = emailTo || 'altayinvestpro@gmail.com';
    const html = `<h3>${subject || 'Notification'}</h3><pre>${JSON.stringify(data || {}, null, 2)}</pre>`;

    const trans = createTransporterIfAvailable();
    if (trans) {
      const info = await trans.sendMail({ from: 'no-reply@ehosp.app', to, subject: subject || 'eHosp Notification', html });
      console.log('Admin notification sent', info);
      res.json({ ok: true, info });
    } else {
      console.log('Admin notification (simulated):', { to, subject, data });
      res.json({ ok: true, simulated: true });
    }
  } catch (err) {
    console.error('sendAdminNotification error', err);
    res.status(500).json({ error: err.message });
  }
};
