# eHosp Cloud Functions (dev)

This folder contains Firebase Cloud Functions to handle admin emails and doctor push relays.

Install & deploy (dev):

```bash
cd functions
npm install
# To emulate locally with Firebase Emulator:
# firebase emulators:start --only functions

# To deploy (requires Firebase project configured):
# firebase deploy --only functions
```

Endpoints created:
- `sendAdminNotification` (HTTP) → POST { emailTo?, subject, data }
- `sendDoctorNotification` (HTTP) → POST { doctorId, title, body, data }
- `healthcheck` (HTTP) → GET

Notes:
- Replace the nodemailer jsonTransport with a real SMTP or SendGrid transporter in production.
- Expo push uses `expo-server-sdk`. Ensure expoPushToken is saved on doctor profiles.
