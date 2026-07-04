import { WeddingConfig } from "../weddingConfig";
import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";


// Interface for RSVP database record
export interface RSVPRecord {
  id: string;
  name: string;
  phone: string;
  guestsCount: number;
  attend: boolean;
  message: string;
  timestamp: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const auth = getAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('[Firebase] Firestore Error Trace:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * DB helper functions that sync with Firestore for Permanent Storage
 * and fallback to Local Storage for high-speed offline capabilities.
 */

// 1. Settings / Configuration
export async function saveConfigToDb(newConfig: WeddingConfig) {
  console.log("[saveConfigToDb] Initiating config save...");
  try {
    // 1. Save locally for fast load
    console.log("[saveConfigToDb] Saving locally to localStorage...");
    localStorage.setItem("wedding_config", JSON.stringify(newConfig));
    window.dispatchEvent(new Event("wedding_config_updated"));
    
    // 2. Save to Firestore
    console.log("[saveConfigToDb] Saving to Firestore (settings/config)...");
    await setDoc(doc(db, "settings", "config"), newConfig);
    console.log("[saveConfigToDb] Successfully saved to Firestore.");
  } catch (err) {
    console.warn("[saveConfigToDb] Failed to save config to Firestore:", err);
    try {
      console.log("[saveConfigToDb] Attempting fallback to Express backend server...");
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig)
      });
      console.log("[saveConfigToDb] Fallback response status:", res.status);
    } catch (fallbackErr) {
      console.warn("[saveConfigToDb] Fallback to server failed:", fallbackErr);
    }
    handleFirestoreError(err, OperationType.WRITE, "settings/config");
  }
}

// Helper to fetch config from server and sync locally
export async function fetchConfigFromDb(): Promise<WeddingConfig | null> {
  console.log("[fetchConfigFromDb] Initiating config fetch...");
  try {
    console.log("[fetchConfigFromDb] Fetching from Firestore (settings/config)...");
    const docSnap = await getDoc(doc(db, "settings", "config"));
    if (docSnap.exists()) {
      console.log("[fetchConfigFromDb] Document found in Firestore.");
      const serverConfig = docSnap.data() as WeddingConfig;
      if (serverConfig && Object.keys(serverConfig).length > 0) {
        console.log("[fetchConfigFromDb] Config is valid. Syncing to localStorage.");
        localStorage.setItem("wedding_config", JSON.stringify(serverConfig));
        window.dispatchEvent(new Event("wedding_config_updated"));
        return serverConfig;
      } else {
        console.warn("[fetchConfigFromDb] Document found but is empty.");
      }
    } else {
      console.log("[fetchConfigFromDb] Document not found in Firestore.");
    }
  } catch (err) {
    console.warn("[fetchConfigFromDb] Failed to fetch configuration from Firestore:", err);
  }
  
  // Fallback to Express backend if Firestore fails
  console.log("[fetchConfigFromDb] Attempting fallback to Express backend server...");
  try {
    const res = await fetch("/api/config");
    console.log("[fetchConfigFromDb] Fallback response status:", res.status);
    if (res.ok) {
      const serverConfig = await res.json();
      if (serverConfig && Object.keys(serverConfig).length > 0) {
        console.log("[fetchConfigFromDb] Fallback config is valid. Syncing to localStorage.");
        localStorage.setItem("wedding_config", JSON.stringify(serverConfig));
        window.dispatchEvent(new Event("wedding_config_updated"));
        return serverConfig;
      }
    }
  } catch (fallbackErr) {
    console.warn("[fetchConfigFromDb] Failed to fetch from backend server:", fallbackErr);
  }
  
  console.log("[fetchConfigFromDb] Returning null (no config found).");
  return null;
}

// 2. RSVP Operations
export async function addRsvpToDb(newRsvp: Omit<RSVPRecord, "id">) {
  let record: RSVPRecord;
  try {
    const rsvpsRef = collection(db, "rsvps");
    const docRef = await addDoc(rsvpsRef, {
      ...newRsvp,
      timestamp: new Date().toISOString()
    });
    record = { id: docRef.id, ...newRsvp, timestamp: new Date().toISOString() };
  } catch (err) {
    console.warn("Save RSVP to Firestore failed, storing locally first:", err);
    // Fallback to purely local ID generation
    const id = `rsvp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    record = { id, ...newRsvp, timestamp: new Date().toISOString() };
  }

  // Update local cache
  const rsvps = getLocalRsvps();
  const filtered = rsvps.filter(r => r.id !== record.id);
  filtered.unshift(record);
  localStorage.setItem("wedding_rsvps", JSON.stringify(filtered));
  window.dispatchEvent(new Event("storage_rsvps_updated"));
  return record;
}

export function getLocalRsvps(): RSVPRecord[] {
  try {
    const raw = localStorage.getItem("wedding_rsvps");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Fetch all RSVPs from server and update local cache
export async function fetchRsvpsFromDb(): Promise<RSVPRecord[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "rsvps"));
    const data: RSVPRecord[] = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() } as RSVPRecord);
    });
    
    localStorage.setItem("wedding_rsvps", JSON.stringify(data));
    window.dispatchEvent(new Event("storage_rsvps_updated"));
    return data;
  } catch (err) {
    console.warn("Failed to fetch RSVPs from Firestore:", err);
  }
  return getLocalRsvps();
}

export async function deleteLocalRsvp(id: string) {
  try {
    await deleteDoc(doc(db, "rsvps", id));
  } catch (err) {
    console.warn("Failed to delete RSVP on Firestore:", err);
  }
  const rsvps = getLocalRsvps();
  const filtered = rsvps.filter(r => r.id !== id);
  localStorage.setItem("wedding_rsvps", JSON.stringify(filtered));
  window.dispatchEvent(new Event("storage_rsvps_updated"));
}

export async function clearAllLocalRsvps() {
  try {
    const querySnapshot = await getDocs(collection(db, "rsvps"));
    const deletePromises = querySnapshot.docs.map(document => deleteDoc(doc(db, "rsvps", document.id)));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn("Failed to clear all RSVPs on Firestore:", err);
  }
  localStorage.removeItem("wedding_rsvps");
  window.dispatchEvent(new Event("storage_rsvps_updated"));
}

// 3. Upload File Chunk (FSDB Placeholder)
export async function uploadChunkToDb() {
  // No-op
}

// 4. Fetch File Chunks (FSDB Placeholder)
export async function fetchChunksFromDb() {
  return "";
}

/**
 * Check which tables are accessible (Mock for complete offline)
 */
