import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, firebaseCollection, firebaseDocId, useFirebase } from "./firebase";
import type { Category, TripState } from "./types";

const LOCAL_STORAGE_KEY = "disney-universal-2028-tracker";

const defaultCategories: Category[] = [
  { id: "flight", name: "Vuelo", target: 1000 },
  { id: "hotel", name: "Hotel", target: 800 },
  { id: "disney", name: "Entradas Disney", target: 500 },
  { id: "universal", name: "Entradas Universal", target: 500 },
  { id: "uber", name: "Uber", target: 350 },
];

export const defaultTripState: TripState = {
  activeProfile: "mica",
  profiles: {
    mica: {
      name: "Mica",
      savedAmount: 0,
      contributions: [],
      categories: defaultCategories.map((category) => ({ ...category })),
    },
    tobi: {
      name: "Tobi",
      savedAmount: 0,
      contributions: [],
      categories: defaultCategories.map((category) => ({ ...category })),
    },
  },
};

export async function loadTripState(): Promise<TripState> {
  if (useFirebase && db) {
    const snap = await getDoc(doc(db, firebaseCollection, firebaseDocId));

    if (snap.exists()) {
      return snap.data() as TripState;
    }

    await saveTripState(defaultTripState);
    return defaultTripState;
  }

  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return defaultTripState;

  try {
    return JSON.parse(raw) as TripState;
  } catch {
    return defaultTripState;
  }
}

export async function saveTripState(state: TripState): Promise<void> {
  if (useFirebase && db) {
    await setDoc(doc(db, firebaseCollection, firebaseDocId), state);
    return;
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
}
