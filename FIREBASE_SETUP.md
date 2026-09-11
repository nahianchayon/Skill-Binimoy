# Firebase Setup

Project: `skillbinimoywebsite`

## 1. Local web configuration

The real Firebase Web App values belong in `.env.local`. Start from the template:

```powershell
Copy-Item .env.example .env.local
```

Do not commit `.env.local`. It is ignored by `.gitignore`.

## 2. Enable Authentication

Open the Firebase Console:

- Authentication: https://console.firebase.google.com/project/skillbinimoywebsite/authentication
- Sign-in providers: https://console.firebase.google.com/project/skillbinimoywebsite/authentication/providers

Click **Get started**, then enable:

- Email/Password
- Google (optional)

Under Authentication -> Settings -> Authorized domains, add:

- `localhost`
- `127.0.0.1`

The error `CONFIGURATION_NOT_FOUND` means Authentication has not been initialized or a provider is not enabled. It is a Firebase Console setting, not a React code error.

## 3. Firestore

Firestore is already created and the rules/indexes are deployed from:

- `firestore.rules`
- `firestore.indexes.json`

View live data at:

https://console.firebase.google.com/project/skillbinimoywebsite/firestore

Deploy again with:

```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

## 4. Storage

Open:

https://console.firebase.google.com/project/skillbinimoywebsite/storage

Click **Get started**, choose the nearest region, and finish the wizard. Then deploy:

```powershell
firebase deploy --only storage
```

Storage rules are in `storage.rules` and restrict profile images to 5 MB and documents to 10 MB.

## 5. Free Spark plan

Authentication, Firestore, and Storage can run on the Firebase Spark plan within quotas.

Cloud Functions cannot be deployed on Spark. The app therefore keeps Functions disabled by default:

```env
VITE_ENABLE_CLOUD_FUNCTIONS=false
```

Premium checkout and trusted tutor booking show a clear upgrade message until Functions are deployed on Blaze. If the project is upgraded later, set:

```env
VITE_ENABLE_CLOUD_FUNCTIONS=true
```

Then deploy:

```powershell
npm install --prefix functions
firebase deploy --only functions
```

## 6. Admin account

1. Enable Email/Password authentication.
2. Register a user at `http://localhost:5174/register`.
3. Open Firestore -> `users`.
4. Open the document matching the Firebase Auth user UID.
5. Change `role` from `USER` to `ADMIN`.
6. Sign in at `http://localhost:5174/admin-login`.

The admin route checks the Firestore role. A normal user cannot promote itself.

## 7. Run the app

```powershell
npm install
npm run dev -- --host 0.0.0.0 --port 5174
```

Open:

- Member login: http://localhost:5174/login
- Member home: http://localhost:5174/dashboard
- Admin login: http://localhost:5174/admin-login
- Admin control room: http://localhost:5174/admin
