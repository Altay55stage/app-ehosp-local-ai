Deploy Cloud Functions (eHosp)

1) Ensure Firebase CLI is installed and you are logged in:

```bash
npm install -g firebase-tools
firebase login
```

2) If you already have a Firebase project, link it to this repo (interactive):

```bash
# Choose or add your project and set it as the default for this repo
firebase use --add
# or explicitly set the project id as default
firebase use <PROJECT_ID>
```

3) (Optional) Set SMTP config for nodemailer (recommended for production):

```bash
# Example - replace with your actual SMTP provider values
firebase functions:config:set smtp.host="smtp.example.com" smtp.port="587" smtp.secure="false" smtp.user="smtp_user" smtp.pass="smtp_pass"
```

4) Deploy only functions:

```bash
# From repo root
firebase deploy --only functions
```

5) After deploy, set the `EXPO_PUBLIC_FUNCTIONS_URL` env var for the app (example):

```
EXPO_PUBLIC_FUNCTIONS_URL=https://<REGION>-<PROJECT_ID>.cloudfunctions.net
```

6) Test endpoints (example):

```bash
# Healthcheck
curl https://<REGION>-<PROJECT_ID>.cloudfunctions.net/healthcheck

# Send admin notification (test)
curl -X POST https://<REGION>-<PROJECT_ID>.cloudfunctions.net/sendAdminNotification \
  -H "Content-Type: application/json" \
  -d '{"subject":"Test","data":{"msg":"hello"}}'
```

Notes:
- If you prefer, run the Firebase emulator locally:

```bash
# from repo root
firebase emulators:start --only functions
# then functions are available at http://localhost:5001/<PROJECT>/us-central1/<functionName>
```

- Replace `YOUR_FIREBASE_PROJECT_ID` in `.firebaserc` with your real project id or run `firebase use --add` to update it automatically.
