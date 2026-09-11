const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const crypto = require("node:crypto");

initializeApp();
const db = getFirestore();
const transactionId = () => `SB-DEMO-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
const requireAuth = (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  return request.auth.uid;
};

exports.createPremiumCheckout = onCall(async (request) => {
  const uid = requireAuth(request);
  const { plan } = request.data || {};
  const prices = { monthly: 299, yearly: 2999 };
  if (!prices[plan]) throw new HttpsError("invalid-argument", "Choose a supported premium plan.");
  const paymentRef = db.collection("payments").doc();
  await paymentRef.set({
    userId: uid,
    type: "PREMIUM",
    plan,
    amount: prices[plan],
    currency: "BDT",
    status: "SUCCESS",
    transactionId: transactionId(),
    createdAt: FieldValue.serverTimestamp(),
  });
  await db.collection("subscriptions").doc(uid).set({
    userId: uid,
    plan,
    status: "ACTIVE",
    startedAt: FieldValue.serverTimestamp(),
    renewedAt: FieldValue.serverTimestamp(),
  });
  await db.collection("users").doc(uid).update({ premium: true });
  return { paymentId: paymentRef.id, transactionId: (await paymentRef.get()).data().transactionId };
});

exports.bookTutor = onCall(async (request) => {
  const uid = requireAuth(request);
  const { tutorId, startAt, endAt, topic, amount } = request.data || {};
  if (!tutorId || !startAt || !endAt || !topic)
    throw new HttpsError("invalid-argument", "Tutor, time and topic are required.");
  const tutor = await db.collection("tutors").doc(tutorId).get();
  if (!tutor.exists || tutor.data().status !== "APPROVED")
    throw new HttpsError("failed-precondition", "Tutor is not currently available.");
  const payment = await db.collection("payments").add({
    userId: uid,
    tutorId,
    type: "TUTOR_BOOKING",
    amount: Number(amount || 0),
    currency: "BDT",
    status: "SUCCESS",
    transactionId: transactionId(),
    createdAt: FieldValue.serverTimestamp(),
  });
  const session = await db.collection("sessions").add({
    participantIds: [uid, tutor.data().userId],
    learnerId: uid,
    tutorId,
    topic,
    startAt,
    endAt,
    status: "SCHEDULED",
    paymentId: payment.id,
    createdAt: FieldValue.serverTimestamp(),
  });
  await db.collection("notifications").add({
    recipientId: tutor.data().userId,
    type: "SESSION",
    title: "New session booking",
    body: `A learner booked ${topic}.`,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { sessionId: session.id, paymentId: payment.id };
});

exports.notifyOnRequest = onDocumentCreated("requests/{requestId}", async (event) => {
  const request = event.data.data();
  await db.collection("notifications").add({
    recipientId: request.recipientId,
    type: "REQUEST",
    title: "New skill exchange request",
    body: request.message || "Someone wants to learn with you.",
    read: false,
    requestId: event.params.requestId,
    createdAt: FieldValue.serverTimestamp(),
  });
});
