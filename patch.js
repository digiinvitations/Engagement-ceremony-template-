import fs from 'fs';
let code = fs.readFileSync('src/lib/supabase.ts', 'utf8');

const target = `// 1. Settings / Configuration
export async function saveConfigToDb(newConfig: WeddingConfig) {
  try {
    // 1. Save locally for fast load
    localStorage.setItem("wedding_config", JSON.stringify(newConfig));
    window.dispatchEvent(new Event("wedding_config_updated"));
    
    // 2. Save to Firestore
    await setDoc(doc(db, "settings", "config"), newConfig);
  } catch (err) {
    console.warn("Failed to save config to Firestore:", err);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig)
      });
    } catch (fallbackErr) {
      console.warn("Fallback to server failed", fallbackErr);
    }
  }
}

// Helper to fetch config from server and sync locally
export async function fetchConfigFromDb(): Promise<WeddingConfig | null> {
  try {
    const docSnap = await getDoc(doc(db, "settings", "config"));
    if (docSnap.exists()) {
      const serverConfig = docSnap.data() as WeddingConfig;
      if (serverConfig && Object.keys(serverConfig).length > 0) {
        localStorage.setItem("wedding_config", JSON.stringify(serverConfig));
        window.dispatchEvent(new Event("wedding_config_updated"));
        return serverConfig;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch configuration from Firestore:", err);
  }
  
  // Fallback to Express backend if Firestore fails
  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      const serverConfig = await res.json();
      if (serverConfig && Object.keys(serverConfig).length > 0) {
        localStorage.setItem("wedding_config", JSON.stringify(serverConfig));
        window.dispatchEvent(new Event("wedding_config_updated"));
        return serverConfig;
      }
    }
  } catch (fallbackErr) {
    console.warn("Failed to fetch from backend server:", fallbackErr);
  }
      
  return null;
}`;

const replacement = `// 1. Settings / Configuration
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
    console.error("[saveConfigToDb] Failed to save config to Firestore:", err);
    try {
      console.log("[saveConfigToDb] Attempting fallback to Express backend server...");
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig)
      });
      console.log("[saveConfigToDb] Fallback response status:", res.status);
    } catch (fallbackErr) {
      console.error("[saveConfigToDb] Fallback to server failed:", fallbackErr);
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
    console.error("[fetchConfigFromDb] Failed to fetch configuration from Firestore:", err);
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
    console.error("[fetchConfigFromDb] Failed to fetch from backend server:", fallbackErr);
  }
  
  console.log("[fetchConfigFromDb] Returning null (no config found).");
  return null;
}`;

if (code.indexOf("// 1. Settings / Configuration") !== -1) {
    const before = code.substring(0, code.indexOf("// 1. Settings / Configuration"));
    const after = code.substring(code.indexOf("// 2. RSVP Operations"));
    fs.writeFileSync('src/lib/supabase.ts', before + replacement + "\\n\\n" + after);
    console.log("Patched successfully");
} else {
    console.log("Not found");
}

