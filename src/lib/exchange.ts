import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { createRecord, requireDb, updateRecord } from "./firestore";

export type ExchangeUser = {
  uid: string;
  displayName?: string | null | undefined;
  email?: string | null | undefined;
  photoURL?: string | null | undefined;
};

export type SkillExchange = {
  id: string;
  requestId?: string | null | undefined;
  conversationId?: string | null | undefined;
  participantIds: string[];
  participants: Record<
    string,
    {
      displayName?: string | undefined;
      email?: string | undefined;
      photoURL?: string | null | undefined;
    }
  >;
  title?: string | undefined;
  skillOffer?: string | undefined;
  skillWanted?: string | undefined;
  status: "ACTIVE" | "COMPLETED" | "PAUSED";
  progress: number; // 0 to 100
  totalTasks: number;
  completedTasks: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type ExchangeTask = {
  id: string;
  exchangeId: string;
  title: string;
  description?: string | undefined;
  createdBy: string;
  createdByName?: string | undefined;
  assignedTo?: string | undefined; // uid or "BOTH"
  assignedToName?: string | undefined;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  dueDate?: string | undefined;
  completed: boolean;
  completedAt?: unknown;
  completedBy?: string | undefined;
  createdAt?: unknown;
  updatedAt?: unknown;
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
 * Recalculates total tasks, completed tasks, and progress percentage (0-100%)
 * for an exchange workspace, updating both the exchange and conversation.
 */
export async function recalculateExchangeProgress(exchangeId: string): Promise<{
  totalTasks: number;
  completedTasks: number;
  progress: number;
}> {
  const database = requireDb();
  if (!exchangeId) return { totalTasks: 0, completedTasks: 0, progress: 0 };

  const tasksSnap = await getDocs(collection(database, "exchanges", exchangeId, "tasks"));
  const totalTasks = tasksSnap.docs.length;
  let completedTasks = 0;

  tasksSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (data["completed"] === true || data["status"] === "COMPLETED") {
      completedTasks++;
    }
  });

  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const exchangeRef = doc(database, "exchanges", exchangeId);
  const exchangeSnap = await getDoc(exchangeRef);

  const updatePayload: Record<string, unknown> = {
    totalTasks,
    completedTasks,
    progress,
    updatedAt: serverTimestamp(),
  };

  if (totalTasks > 0 && completedTasks === totalTasks) {
    updatePayload["status"] = "COMPLETED";
  } else if (exchangeSnap.exists() && exchangeSnap.data()["status"] === "COMPLETED" && completedTasks < totalTasks) {
    updatePayload["status"] = "ACTIVE";
  }

  await updateDoc(exchangeRef, updatePayload);

  // Also update linked conversation if present
  if (exchangeSnap.exists()) {
    const convId = exchangeSnap.data()["conversationId"] as string | undefined;
    if (convId) {
      await updateDoc(doc(database, "conversations", convId), {
        exchangeProgress: progress,
        exchangeTasksCompleted: completedTasks,
        exchangeTasksTotal: totalTasks,
      }).catch(console.warn);
    }
  }

  return { totalTasks, completedTasks, progress };
}

/**
 * Accepts a skill exchange request:
 * 1. Marks the request as ACCEPTED.
 * 2. Marks the notification as ACCEPTED.
 * 3. Creates or links a conversation in both users' inboxes.
 * 4. Creates an active Skill Exchange Workspace with initial starter tasks.
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
      lastMessage: "Skill exchange accepted! You can now chat, track exchange tasks, and video call live.",
      lastMessageAt: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
    conversationId = convDoc.id;

    // Send initial welcoming message
    await addDoc(collection(database, "conversations", conversationId, "messages"), {
      senderId: currentUser.uid,
      text: `🎉 Skill exchange request accepted! Let's connect and share skills. You can chat here, track our exchange todo list and progress above, or start a live video call anytime.`,
      createdAt: serverTimestamp(),
    });
  } else {
    // Update existing conversation timestamp and lastMessage
    await updateDoc(doc(database, "conversations", conversationId), {
      lastMessage: "Skill exchange request accepted! You can now chat, track exchange tasks, and video call live.",
      lastMessageAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
  }

  // 4. Find or create an active exchange workspace document
  let exchangeId = "";
  const exchangeQuery = query(
    collection(database, "exchanges"),
    where("participantIds", "array-contains", currentUser.uid),
  );
  const exchangeSnap = await getDocs(exchangeQuery);
  for (const docSnap of exchangeSnap.docs) {
    const data = docSnap.data();
    const ids = (data["participantIds"] as string[]) || [];
    if (ids.includes(senderId)) {
      exchangeId = docSnap.id;
      break;
    }
  }

  if (!exchangeId) {
    const exchangeDoc = await addDoc(collection(database, "exchanges"), {
      requestId: requestId || null,
      conversationId,
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
      title: `Skill Exchange: ${currentUserName} & ${partnerName}`,
      status: "ACTIVE",
      progress: 0,
      totalTasks: 3,
      completedTasks: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    exchangeId = exchangeDoc.id;

    // Seed initial 3 milestone tasks
    const starterTasks = [
      {
        exchangeId,
        title: "🎯 Initial alignment & topic overview",
        description: "Introduce goals, share background, and confirm what topics will be covered.",
        createdBy: currentUser.uid,
        createdByName: currentUserName,
        assignedTo: "BOTH",
        assignedToName: "Both Members",
        status: "PENDING",
        completed: false,
        createdAt: serverTimestamp(),
      },
      {
        exchangeId,
        title: "📚 First skill sharing & practical walkthrough",
        description: "Hold a live video call or chat session to walk through core concepts.",
        createdBy: currentUser.uid,
        createdByName: currentUserName,
        assignedTo: currentUser.uid,
        assignedToName: currentUserName,
        status: "PENDING",
        completed: false,
        createdAt: serverTimestamp(),
      },
      {
        exchangeId,
        title: "💡 Practice review, hands-on Q&A, and mutual feedback",
        description: "Review exercises, address questions, and provide reciprocal constructive feedback.",
        createdBy: currentUser.uid,
        createdByName: currentUserName,
        assignedTo: senderId,
        assignedToName: partnerName,
        status: "PENDING",
        completed: false,
        createdAt: serverTimestamp(),
      },
    ];

    for (const t of starterTasks) {
      await addDoc(collection(database, "exchanges", exchangeId, "tasks"), t);
    }
  }

  // Link exchangeId back to the conversation
  if (conversationId && exchangeId) {
    await updateDoc(doc(database, "conversations", conversationId), {
      exchangeId,
    }).catch(console.warn);
  }

  // 5. Send acceptance notification to original sender
  await createRecord("notifications", {
    recipientId: senderId,
    senderId: currentUser.uid,
    senderName: currentUserName,
    senderPhoto: currentUser.photoURL || null,
    type: "REQUEST_ACCEPTED",
    title: "Exchange Request Accepted!",
    message: `${currentUserName} accepted your skill exchange request. You can now track progress, complete shared tasks, and video call!`,
    conversationId,
    exchangeId,
    status: "UNREAD",
  });

  return conversationId;
}

/**
 * Ensures an exchange workspace exists between two connected users.
 * If one doesn't exist yet, creates it and seeds default starter tasks.
 */
export async function getOrCreateExchangeForUsers({
  currentUserId,
  currentUserName,
  currentUserPhoto,
  partnerId,
  partnerName,
  partnerPhoto,
  conversationId,
}: {
  currentUserId: string;
  currentUserName: string;
  currentUserPhoto?: string | null | undefined;
  partnerId: string;
  partnerName: string;
  partnerPhoto?: string | null | undefined;
  conversationId?: string | undefined;
}): Promise<string> {
  const database = requireDb();
  if (!currentUserId || !partnerId) return "";

  // Check if conversation already has exchangeId
  if (conversationId) {
    try {
      const convSnap = await getDoc(doc(database, "conversations", conversationId));
      if (convSnap.exists()) {
        const existingExchangeId = convSnap.data()["exchangeId"] as string | undefined;
        if (existingExchangeId) return existingExchangeId;
      }
    } catch {
      // Continue to query
    }
  }

  // Query existing exchanges by participantIds
  const q = query(
    collection(database, "exchanges"),
    where("participantIds", "array-contains", currentUserId),
  );
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    const ids = (d.data()["participantIds"] as string[]) || [];
    if (ids.includes(partnerId)) {
      const foundId = d.id;
      if (conversationId) {
        await updateDoc(doc(database, "conversations", conversationId), {
          exchangeId: foundId,
        }).catch(console.warn);
      }
      return foundId;
    }
  }

  // Create new active exchange
  const exchangeDoc = await addDoc(collection(database, "exchanges"), {
    conversationId: conversationId || null,
    participantIds: [currentUserId, partnerId],
    participants: {
      [currentUserId]: {
        displayName: currentUserName,
        photoURL: currentUserPhoto || null,
      },
      [partnerId]: {
        displayName: partnerName,
        photoURL: partnerPhoto || null,
      },
    },
    title: `Skill Exchange: ${currentUserName} & ${partnerName}`,
    status: "ACTIVE",
    progress: 0,
    totalTasks: 3,
    completedTasks: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const exchangeId = exchangeDoc.id;

  const starterTasks = [
    {
      exchangeId,
      title: "🎯 Initial alignment & topic overview",
      description: "Introduce goals, share background, and confirm what topics will be covered.",
      createdBy: currentUserId,
      createdByName: currentUserName,
      assignedTo: "BOTH",
      assignedToName: "Both Members",
      status: "PENDING",
      completed: false,
      createdAt: serverTimestamp(),
    },
    {
      exchangeId,
      title: "📚 First skill sharing & practical walkthrough",
      description: "Hold a live video call or chat session to walk through core concepts.",
      createdBy: currentUserId,
      createdByName: currentUserName,
      assignedTo: currentUserId,
      assignedToName: currentUserName,
      status: "PENDING",
      completed: false,
      createdAt: serverTimestamp(),
    },
    {
      exchangeId,
      title: "💡 Practice review, hands-on Q&A, and mutual feedback",
      description: "Review exercises, address questions, and provide reciprocal constructive feedback.",
      createdBy: currentUserId,
      createdByName: currentUserName,
      assignedTo: partnerId,
      assignedToName: partnerName,
      status: "PENDING",
      completed: false,
      createdAt: serverTimestamp(),
    },
  ];

  for (const t of starterTasks) {
    await addDoc(collection(database, "exchanges", exchangeId, "tasks"), t);
  }

  if (conversationId) {
    await updateDoc(doc(database, "conversations", conversationId), {
      exchangeId,
    }).catch(console.warn);
  }

  return exchangeId;
}

/**
 * Creates a new task in an exchange workspace.
 */
export async function createExchangeTask({
  exchangeId,
  title,
  description,
  createdBy,
  createdByName,
  assignedTo,
  assignedToName,
  dueDate,
}: {
  exchangeId: string;
  title: string;
  description?: string | undefined;
  createdBy: string;
  createdByName?: string | undefined;
  assignedTo?: string | undefined;
  assignedToName?: string | undefined;
  dueDate?: string | undefined;
}) {
  const database = requireDb();
  if (!exchangeId || !title.trim()) return;

  await addDoc(collection(database, "exchanges", exchangeId, "tasks"), {
    exchangeId,
    title: title.trim(),
    description: description ? description.trim() : "",
    createdBy,
    createdByName: createdByName || "Member",
    assignedTo: assignedTo || "BOTH",
    assignedToName: assignedToName || "Both Members",
    dueDate: dueDate || "",
    status: "PENDING",
    completed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await recalculateExchangeProgress(exchangeId);
}

/**
 * Toggles a task's completion status, updating progress dynamically.
 */
export async function toggleExchangeTaskCompletion({
  exchangeId,
  taskId,
  completed,
  completedBy,
}: {
  exchangeId: string;
  taskId: string;
  completed: boolean;
  completedBy?: string | undefined;
}) {
  const database = requireDb();
  if (!exchangeId || !taskId) return;

  const updateData: Record<string, unknown> = {
    completed,
    status: completed ? "COMPLETED" : "PENDING",
    completedAt: completed ? new Date().toISOString() : null,
    completedBy: completed ? (completedBy || null) : null,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(database, "exchanges", exchangeId, "tasks", taskId), updateData);
  await recalculateExchangeProgress(exchangeId);
}

/**
 * Deletes a task and recalculates progress.
 */
export async function deleteExchangeTask({
  exchangeId,
  taskId,
}: {
  exchangeId: string;
  taskId: string;
}) {
  const database = requireDb();
  if (!exchangeId || !taskId) return;

  await deleteDoc(doc(database, "exchanges", exchangeId, "tasks", taskId));
  await recalculateExchangeProgress(exchangeId);
}

/**
 * Updates an exchange's overall status (ACTIVE, COMPLETED, PAUSED).
 */
export async function updateExchangeStatus({
  exchangeId,
  status,
}: {
  exchangeId: string;
  status: "ACTIVE" | "COMPLETED" | "PAUSED";
}) {
  const database = requireDb();
  if (!exchangeId) return;

  await updateDoc(doc(database, "exchanges", exchangeId), {
    status,
    updatedAt: serverTimestamp(),
  });
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
