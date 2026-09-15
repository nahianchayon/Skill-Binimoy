import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { createRecord, requireDb, updateRecord } from "./firestore";

export type ExchangeUser = {
  uid: string;
  displayName?: string | null | undefined;
  email?: string | null | undefined;
  photoURL?: string | null | undefined;
};

/**
 * Sends a skill exchange request to another user and creates a real-time notification
 * in the recipient's notification inbox.
 */
export async function sendExchangeRequest({
  sender,
  recipientId,
  recipientName,
  message,
  postId,
}: {
  sender: ExchangeUser;
  recipientId: string;
  recipientName?: string | undefined;
  message: string;
  postId?: string | undefined;
}) {
  if (!sender.uid || !recipientId) {
    throw new Error("Invalid sender or recipient.");
  }
  if (sender.uid === recipientId) {
    throw new Error("You cannot send an exchange request to yourself.");
  }

  const senderName = sender.displayName || sender.email?.split("@")[0] || "A member";
  const reqData = {
    senderId: sender.uid,
    senderName,
    senderPhoto: sender.photoURL || null,
    recipientId,
    recipientName: recipientName || "Member",
    message,
    postId: postId || null,
    status: "PENDING",
  };

  const reqDoc = await createRecord("requests", reqData);

  // Send real-time notification to the recipient
  await createRecord("notifications", {
    recipientId,
    senderId: sender.uid,
    senderName,
    senderPhoto: sender.photoURL || null,
    type: "EXCHANGE_REQUEST",
    title: "New Skill Exchange Request",
    message: `${senderName} wants to exchange skills: "${message}"`,
    requestId: reqDoc.id,
    status: "PENDING",
  });

  return reqDoc.id;
}

/**
 * Accepts a skill exchange request:
 * 1. Marks the request as ACCEPTED.
 * 2. Marks the notification as ACCEPTED.
 * 3. Creates or links a conversation in both users' inboxes.
 * 4. Sends an initial greeting message in the chat.
 * 5. Sends an acceptance notification back to the original sender.
 */
export async function acceptExchangeRequest({
  currentUser,
  requestId,
  notificationId,
  senderId,
  senderName,
  senderPhoto,
}: {
  currentUser: ExchangeUser;
  requestId: string;
  notificationId?: string | undefined;
  senderId: string;
  senderName?: string | undefined;
  senderPhoto?: string | null | undefined;
}): Promise<string> {
  const database = requireDb();

  // 1. Mark request ACCEPTED
  if (requestId) {
    await updateRecord("requests", requestId, { status: "ACCEPTED" });
  }

  // 2. Mark notification ACCEPTED if provided
  if (notificationId) {
    await updateRecord("notifications", notificationId, { status: "ACCEPTED" });
  }

  const currentUserName = currentUser.displayName || currentUser.email?.split("@")[0] || "Member";
  const partnerName = senderName || "Partner";

  // 3. Find or create a conversation between the two users
  let conversationId = "";
  const existingQuery = query(
    collection(database, "conversations"),
    where("participantIds", "array-contains", currentUser.uid),
  );
  const snapshot = await getDocs(existingQuery);
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const ids = (data["participantIds"] as string[]) || [];
    if (ids.includes(senderId)) {
      conversationId = docSnap.id;
      break;
    }
  }

  if (!conversationId) {
    const convDoc = await addDoc(collection(database, "conversations"), {
      participantIds: [currentUser.uid, senderId],
      participants: {
        [currentUser.uid]: {
          displayName: currentUserName,
          photoURL: currentUser.photoURL || null,
        },
        [senderId]: {
          displayName: partnerName,
          photoURL: senderPhoto || null,
        },
      },
      requestId: requestId || null,
      lastMessage: "Skill exchange accepted! You can now chat and video call live.",
      lastMessageAt: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
    conversationId = convDoc.id;

    // Send initial welcoming message
    await addDoc(collection(database, "conversations", conversationId, "messages"), {
      senderId: currentUser.uid,
      text: `🎉 Skill exchange request accepted! Let's connect and share skills. You can chat here or start a live video call anytime.`,
      createdAt: serverTimestamp(),
    });
  } else {
    // Update existing conversation timestamp and lastMessage
    await updateDoc(doc(database, "conversations", conversationId), {
      lastMessage: "Skill exchange request accepted! You can now chat and video call live.",
      lastMessageAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
  }

  // 4. Send acceptance notification to original sender
  await createRecord("notifications", {
    recipientId: senderId,
    senderId: currentUser.uid,
    senderName: currentUserName,
    senderPhoto: currentUser.photoURL || null,
    type: "REQUEST_ACCEPTED",
    title: "Exchange Request Accepted!",
    message: `${currentUserName} accepted your skill exchange request. You can now chat and video call!`,
    conversationId,
    status: "UNREAD",
  });

  return conversationId;
}

/**
 * Rejects a skill exchange request:
 * Marks request and notification as REJECTED.
 */
export async function rejectExchangeRequest({
  requestId,
  notificationId,
}: {
  requestId: string;
  notificationId?: string | undefined;
}) {
  if (requestId) {
    await updateRecord("requests", requestId, { status: "REJECTED" });
  }
  if (notificationId) {
    await updateRecord("notifications", notificationId, { status: "REJECTED" });
  }
}
