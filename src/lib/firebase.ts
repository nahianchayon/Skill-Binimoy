import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey:
    import.meta.env["VITE_FIREBASE_API_KEY"] ||
    "AIzaSyCH40uAstln0Uq4QO8uKp8jx89ozSoCCO4",
  authDomain:
    import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"] ||
    "skillbinimoywebsite.firebaseapp.com",
  projectId:
    import.meta.env["VITE_FIREBASE_PROJECT_ID"] || "skillbinimoywebsite",
  storageBucket:
    import.meta.env["VITE_FIREBASE_STORAGE_BUCKET"] ||
    "skillbinimoywebsite.firebasestorage.app",
  messagingSenderId:
    import.meta.env["VITE_FIREBASE_MESSAGING_SENDER_ID"] || "698329108361",
  appId:
    import.meta.env["VITE_FIREBASE_APP_ID"] ||
    "1:698329108361:web:09ba5025ffbc210ac8db58",
};

export const firebaseEnabled = Object.values(firebaseConfig).every(Boolean);
const app = firebaseEnabled
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const cloudFunctionsEnabled = import.meta.env["VITE_ENABLE_CLOUD_FUNCTIONS"] === "true";
export const functions = app && cloudFunctionsEnabled ? getFunctions(app) : null;

if (app && import.meta.env["VITE_USE_FIREBASE_EMULATORS"] === "true") {
  connectAuthEmulator(auth!, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db!, "127.0.0.1", 8080);
  connectStorageEmulator(storage!, "127.0.0.1", 9199);
  if (functions) connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
