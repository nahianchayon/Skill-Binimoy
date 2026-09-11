import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export const COLLECTIONS = {
  users: "users",
  skills: "skills",
  posts: "posts",
  requests: "requests",
  sessions: "sessions",
  conversations: "conversations",
  messages: "messages",
  notifications: "notifications",
  reviews: "reviews",
  tutorApplications: "tutorApplications",
  tutors: "tutors",
  subscriptions: "subscriptions",
  payments: "payments",
  rewards: "rewards",
  solutions: "solutions",
  reports: "reports",
  blocks: "blocks",
  securityLogs: "securityLogs",
  adminLogs: "adminLogs",
  products: "products",
  carts: "carts",
  orders: "orders",
  supportTickets: "supportTickets",
  announcements: "announcements",
  favorites: "favorites",
} as const;

export function requireDb() {
  if (!db)
    throw new Error(
      "Firebase is not configured. Copy .env.example to .env.local and add your Firebase values.",
    );
  return db;
}

export async function createRecord<T extends DocumentData>(collectionName: string, data: T) {
  const database = requireDb();
  return addDoc(collection(database, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateRecord(collectionName: string, id: string, data: DocumentData) {
  return setDoc(
    doc(requireDb(), collectionName, id),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function deleteRecord(collectionName: string, id: string) {
  return deleteDoc(doc(requireDb(), collectionName, id));
}

export async function getRecord(collectionName: string, id: string) {
  return getDoc(doc(requireDb(), collectionName, id));
}

export function watchRecords<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[],
  onData: (rows: (T & { id: string })[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    onData([]);
    return () => undefined;
  }
  const ref = query(collection(requireDb(), collectionName), ...constraints);
  return onSnapshot(
    ref,
    (snapshot) =>
      onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T & { id: string })),
    onError,
  );
}

export { orderBy, where, serverTimestamp };
