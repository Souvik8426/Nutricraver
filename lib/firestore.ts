import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

function db() {
  return getFirebaseDb();
}

// ─── User Profile ────────────────────────────────────────────

export type UserProfile = {
  displayName: string;
  email: string;
  photoURL: string | null;
  diet: string;
  allergies: string;
  deliveryArea: string;
  favoriteCuisines: string[];
};

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db(), "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
) {
  await setDoc(
    doc(db(), "users", uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// ─── Orders ──────────────────────────────────────────────────

export type OrderItem = {
  name: string;
  price: number;
  quantity: number;
  restaurantName: string;
};

export type Order = {
  id: string;
  items: OrderItem[];
  total: number;
  status: "Placed" | "Delivered" | "Cancelled";
  trackingId: string;
  createdAt: Date;
};

export async function getUserOrders(uid: string): Promise<Order[]> {
  const ref = collection(db(), "users", uid, "orders");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      items: data.items ?? [],
      total: data.total ?? 0,
      status: data.status ?? "Placed",
      trackingId: data.trackingId ?? "",
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    } as Order;
  });
}

export async function createOrder(
  uid: string,
  orderData: {
    items: OrderItem[];
    total: number;
    trackingId: string;
  }
) {
  const ref = doc(collection(db(), "users", uid, "orders"));
  await setDoc(ref, {
    ...orderData,
    status: "Placed",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── Cart ────────────────────────────────────────────────────

export type CartItemDoc = {
  id: string;
  name: string;
  price: number;
  restaurantName: string;
  quantity: number;
};

export async function getCart(uid: string): Promise<CartItemDoc[]> {
  const ref = collection(db(), "users", uid, "cart");
  const snap = await getDocs(ref);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<CartItemDoc, "id">),
  }));
}

export async function saveCart(uid: string, items: CartItemDoc[]) {
  const cartRef = collection(db(), "users", uid, "cart");

  // Clear existing cart
  const existing = await getDocs(cartRef);
  const batch = writeBatch(db());
  existing.docs.forEach((d) => batch.delete(d.ref));

  // Write new items
  for (const item of items) {
    const itemRef = doc(cartRef, item.id);
    batch.set(itemRef, {
      name: item.name,
      price: item.price,
      restaurantName: item.restaurantName,
      quantity: item.quantity,
    });
  }

  await batch.commit();
}

export async function clearCart(uid: string) {
  const cartRef = collection(db(), "users", uid, "cart");
  const snap = await getDocs(cartRef);
  const batch = writeBatch(db());
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

// ─── Chat History ─────────────────────────────────────────────

export type ChatHistoryMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: Date;
};

export async function saveChatMessage(
  uid: string,
  role: "user" | "assistant",
  text: string
) {
  const ref = collection(db(), "users", uid, "chatHistory");
  await addDoc(ref, { role, text, createdAt: serverTimestamp() });
}

export async function getChatHistory(
  uid: string,
  maxMessages = 60
): Promise<ChatHistoryMessage[]> {
  const ref = collection(db(), "users", uid, "chatHistory");
  const q = query(ref, orderBy("createdAt", "asc"), limit(maxMessages));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      role: data.role as "user" | "assistant",
      text: data.text as string,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    };
  });
}

export function subscribeToChatHistory(
  uid: string,
  callback: (messages: ChatHistoryMessage[]) => void,
  maxMessages = 60
): Unsubscribe {
  const ref = collection(db(), "users", uid, "chatHistory");
  const q = query(ref, orderBy("createdAt", "asc"), limit(maxMessages));
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        role: data.role as "user" | "assistant",
        text: data.text as string,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
      };
    });
    callback(messages);
  });
}

// ─── onSnapshot helpers ───────────────────────────────────────

export function subscribeToOrders(
  uid: string,
  callback: (orders: Order[]) => void
): Unsubscribe {
  const ref = collection(db(), "users", uid, "orders");
  const q = query(ref, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        items: data.items ?? [],
        total: data.total ?? 0,
        status: data.status ?? "Placed",
        trackingId: data.trackingId ?? "",
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
      } as Order;
    });
    callback(orders);
  });
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  return onSnapshot(doc(db(), "users", uid), (snap) => {
    callback(snap.exists() ? (snap.data() as UserProfile) : null);
  });
}
