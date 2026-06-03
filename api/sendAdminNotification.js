let transporter = null;

function createTransporterIfAvailable() {
  if (transporter) return transporter;
  try {
    // require nodemailer only if available in the runtime
    // if not present, we'll fall back to a JSON-logging behavior
    // and avoid crashing the function.
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

    console.log('sendAdminNotification headers:', req.headers);

    // Support environments where req.body may not be parsed
    let body = req.body;
    if (!body) {
      try {
        body = await new Promise((resolve, reject) => {
          let buf = '';
          req.on('data', (chunk) => (buf += chunk));
          req.on('end', () => {
            try {
              resolve(buf ? JSON.parse(buf) : {});
            } catch (e) {
              reject(e);
            }
          });
          req.on('error', reject);
        });
      } catch (e) {
        console.warn('Failed to parse raw request body', e.message);
        body = {};
      }
    }

    const { emailTo, subject, data } = body || {};
    const to = emailTo || 'altayinvestpro@gmail.com';
    const html = `<h3>${subject || 'Notification'}</h3><pre>${JSON.stringify(data || {}, null, 2)}</pre>`;
    try {
      const trans = createTransporterIfAvailable();
      if (trans) {
        const info = await trans.sendMail({ from: 'no-reply@ehosp.app', to, subject: subject || 'eHosp Notification', html });
        console.log('Admin notification sent', info);
        res.json({ ok: true, info });
      } else {
        // nodemailer not available; fallback to logging the payload and return ok
        console.log('Admin notification (simulated):', { to, subject, data });
        res.json({ ok: true, simulated: true });
      }
    } catch (sendErr) {
      console.error('Failed to send mail', sendErr);
      res.status(500).json({ error: 'failed_to_send_mail', details: sendErr.message });
    }
  } catch (err) {
    console.error('sendAdminNotification error', err);
    res.status(500).json({ error: 'internal_error', details: err.message });
  }
};
