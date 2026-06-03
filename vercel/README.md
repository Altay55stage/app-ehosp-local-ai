Deploy notification endpoints to Vercel (free)

1) Install Vercel CLI and login:

```bash
npm i -g vercel
vercel login
```

2) From repo root, deploy once to create a project (choose or name):

```bash
vercel --prod
```

3) Set environment variables in Vercel dashboard (Project Settings > Environment Variables):
- `SMTP_HOST` (optional)
- `SMTP_PORT` (optional)
- `SMTP_SECURE` (false/true)
- `SMTP_USER` (optional)
- `SMTP_PASS` (optional)

4) Endpoints:
- `GET /api/healthcheck` → health
- `POST /api/sendAdminNotification` → body { emailTo?, subject?, data? }
- `POST /api/sendDoctorNotification` → body { expoPushToken, title, body, data }
- `POST /api/checkPushReceipts` → body { ticketIds: [] }

5) After deploy, set `EXPO_PUBLIC_FUNCTIONS_URL` to your Vercel base URL (e.g. `https://your-project.vercel.app`) in your Expo app configuration or environment.

6) Notes:
- These endpoints intentionally avoid Firestore persistence to keep deployment simple and avoid Firebase Blaze requirement. If you want persistence, configure Google service account credentials and add Firestore logic.
- For production email, configure SMTP or any transactional email provider and set credentials in Vercel environment variables.
