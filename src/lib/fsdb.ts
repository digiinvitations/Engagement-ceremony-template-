import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const CHUNK_SIZE = 500000;
const memoryCache = new Map<string, string>();

// Simple IndexedDB wrapper for persistent caching & local storage
function getIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("FSDB_Cache", 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getFromIDB(key: string): Promise<string | null> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readonly");
      const store = tx.objectStore("files");
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return null;
  }
}

async function saveToIDB(key: string, value: string): Promise<void> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    // Ignore
  }
}

export function transformGoogleDriveUrl(url: string): string {
  if (!url) return url;
  
  // Handle drive.google.com/file/d/ID/view format
  const match1 = url.match(/\/file\/d\/([^/]+)/);
  if (match1 && match1[1]) {
    return `https://drive.google.com/uc?export=download&id=${match1[1]}`;
  }
  
  // Handle drive.google.com/open?id=ID format
  const match2 = url.match(/id=([^&]+)/);
  if (url.includes('drive.google.com') && match2 && match2[1]) {
    return `https://drive.google.com/uc?export=download&id=${match2[1]}`;
  }
  
  return url;
}

export async function uploadToFsdb(base64: string): Promise<string> {
  const fileId = `fsdb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const fileUrl = `fsdb://${fileId}`;
  
  try {
    await saveToIDB(fileUrl, base64);
    memoryCache.set(fileUrl, base64);
  } catch (err) {
    console.error("Local storage to IndexedDB failed:", err);
  }
  
  // Save to Firestore in chunks
  try {
    const totalChunks = Math.ceil(base64.length / CHUNK_SIZE);
    const createdAt = new Date().toISOString();
    
    // Save each chunk
    for (let i = 0; i < totalChunks; i++) {
      const chunkData = base64.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await setDoc(doc(db, "fsFiles", `${fileId}_chunk_${i}`), {
        fileId: fileId,
        index: i,
        data: chunkData,
        totalChunks: totalChunks,
        createdAt: createdAt
      });
    }
  } catch (err) {
    console.error("Failed to upload chunks to Firestore:", err);
  }
  
  return fileUrl;
}

export async function fetchFromFsdb(fileUrl: string): Promise<string> {
  if (!fileUrl) return fileUrl;
  if (!fileUrl.startsWith("fsdb://")) return transformGoogleDriveUrl(fileUrl);
  
  if (memoryCache.has(fileUrl)) {
    return memoryCache.get(fileUrl)!;
  }
  
  const idbCache = await getFromIDB(fileUrl);
  if (idbCache) {
    memoryCache.set(fileUrl, idbCache);
    return idbCache;
  }
  
  // If not in cache, try to fetch from Firestore
  try {
    const fileId = fileUrl.replace("fsdb://", "");
    
    // Query chunk 0 to get metadata
    const chunk0Doc = await getDoc(doc(db, "fsFiles", `${fileId}_chunk_0`));
    
    if (chunk0Doc.exists()) {
      const totalChunks = chunk0Doc.data().totalChunks;
      let fullBase64 = chunk0Doc.data().data;
      
      for (let i = 1; i < totalChunks; i++) {
        const chunkDoc = await getDoc(doc(db, "fsFiles", `${fileId}_chunk_${i}`));
        if (chunkDoc.exists()) {
          fullBase64 += chunkDoc.data().data;
        } else {
          console.error(`Chunk ${i} missing for ${fileId}`);
          return "";
        }
      }
      
      if (fullBase64) {
        await saveToIDB(fileUrl, fullBase64);
        memoryCache.set(fileUrl, fullBase64);
        return fullBase64;
      }
    } else {
      console.warn(`Chunk 0 missing for ${fileId}`);
    }
  } catch (err) {
    console.error("Failed to fetch from Firestore fsFiles:", err);
  }
  
  return "";
}
