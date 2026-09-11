# Skill Binimoy

Skill Binimoy is a Firebase-backed skill exchange platform built with React, Vite, TanStack Router, Firestore, Storage and Cloud Functions.

For the complete Authentication, Firestore, Storage, free Spark-plan, and admin setup, see [FIREBASE_SETUP.md](FIREBASE_SETUP.md).

## Run locally

```powershell
Copy-Item .env.example .env.local
# Add the Firebase Web App values to .env.local
npm install
npm run dev
```

Enable Email/Password and Google providers in Firebase Authentication, create a Firestore database, enable Storage and App Check, then deploy the rules and functions:

```powershell
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules,firestore:indexes,storage,functions,hosting
```

The frontend never writes premium, role, verification, payment or admin log fields directly. Those transitions are handled by Firestore rules and callable Cloud Functions when Functions are enabled. Demo checkout produces `SB-DEMO-XXXXXX` transactions and never accepts card details.
