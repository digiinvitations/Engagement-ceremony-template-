import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Ensure data directories exist
const DATA_DIR = path.join(process.cwd(), "src", "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Support large JSON bodies for base64 image/audio uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Paths to JSON storage files
const CONFIG_FILE = path.join(DATA_DIR, "wedding_config.json");
const RSVPS_FILE = path.join(DATA_DIR, "rsvps.json");

// Serve uploaded media files statically
app.use("/uploads", express.static(UPLOADS_DIR));

// 1. Get Wedding Configuration
app.get("/api/config", (req, res) => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      return res.json(JSON.parse(data));
    }
    // If no custom config exists, send empty object or let client use its default
    return res.json({});
  } catch (error) {
    console.error("Error reading config:", error);
    res.status(500).json({ error: "Failed to read configuration" });
  }
});

// 2. Save Wedding Configuration
app.post("/api/config", (req, res) => {
  try {
    const configData = req.body;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2), "utf-8");
    res.json({ success: true, message: "Configuration saved successfully" });
  } catch (error) {
    console.error("Error saving config:", error);
    res.status(500).json({ error: "Failed to save configuration" });
  }
});

// 3. Get RSVPs
app.get("/api/rsvps", (req, res) => {
  try {
    if (fs.existsSync(RSVPS_FILE)) {
      const data = fs.readFileSync(RSVPS_FILE, "utf-8");
      return res.json(JSON.parse(data));
    }
    return res.json([]);
  } catch (error) {
    console.error("Error reading RSVPs:", error);
    res.status(500).json({ error: "Failed to read RSVPs" });
  }
});

// 4. Submit RSVP
app.post("/api/rsvps", (req, res) => {
  try {
    const newRsvp = req.body;
    let rsvps = [];
    
    if (fs.existsSync(RSVPS_FILE)) {
      const data = fs.readFileSync(RSVPS_FILE, "utf-8");
      try {
        rsvps = JSON.parse(data);
      } catch (e) {
        rsvps = [];
      }
    }
    
    // Generate a secure unique ID if not present
    if (!newRsvp.id) {
      newRsvp.id = `rsvp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    if (!newRsvp.timestamp) {
      newRsvp.timestamp = new Date().toISOString();
    }
    
    rsvps.unshift(newRsvp);
    fs.writeFileSync(RSVPS_FILE, JSON.stringify(rsvps, null, 2), "utf-8");
    res.json(newRsvp);
  } catch (error) {
    console.error("Error adding RSVP:", error);
    res.status(500).json({ error: "Failed to submit RSVP" });
  }
});

// 5. Delete single RSVP
app.delete("/api/rsvps/:id", (req, res) => {
  try {
    const { id } = req.params;
    if (fs.existsSync(RSVPS_FILE)) {
      const data = fs.readFileSync(RSVPS_FILE, "utf-8");
      let rsvps = JSON.parse(data);
      rsvps = rsvps.filter((r: any) => r.id !== id);
      fs.writeFileSync(RSVPS_FILE, JSON.stringify(rsvps, null, 2), "utf-8");
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting RSVP:", error);
    res.status(500).json({ error: "Failed to delete RSVP" });
  }
});

// 6. Clear all RSVPs
app.delete("/api/rsvps", (req, res) => {
  try {
    fs.writeFileSync(RSVPS_FILE, JSON.stringify([], null, 2), "utf-8");
    res.json({ success: true });
  } catch (error) {
    console.error("Error clearing RSVPs:", error);
    res.status(500).json({ error: "Failed to clear RSVPs" });
  }
});

// 7. Handle file uploads (converts base64 to server-side files)
app.post("/api/upload", (req, res) => {
  try {
    const { base64, fileType } = req.body;
    if (!base64) {
      return res.status(400).json({ error: "Missing file data" });
    }

    // Extract raw base64 data and mime type
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let extension = "bin";
    let buffer: Buffer;

    if (matches && matches.length === 3) {
      const mime = matches[1];
      buffer = Buffer.from(matches[2], "base64");
      
      // Determine file extension
      if (mime.includes("image/png")) extension = "png";
      else if (mime.includes("image/jpeg") || mime.includes("image/jpg")) extension = "jpg";
      else if (mime.includes("image/webp")) extension = "webp";
      else if (mime.includes("image/gif")) extension = "gif";
      else if (mime.includes("audio/mpeg") || mime.includes("audio/mp3")) extension = "mp3";
      else if (mime.includes("audio/ogg")) extension = "ogg";
      else if (mime.includes("audio/wav")) extension = "wav";
      else if (mime.includes("audio/m4a")) extension = "m4a";
    } else {
      // Direct raw base64 without data URI prefix
      buffer = Buffer.from(base64, "base64");
      if (fileType === "audio") extension = "mp3";
      else if (fileType === "image") extension = "webp";
    }

    const filename = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    // Return the relative URL of the uploaded file
    const fileUrl = `/uploads/${filename}`;
    res.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to process upload" });
  }
});


// 8. Fetch external URL to bypass CORS and convert to base64
app.post("/api/fetch-url", async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing URL" });
    
    // Transform Google Drive URL if needed
    if (url.includes("drive.google.com/file/d/")) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        url = `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    } else if (url.includes("drive.google.com/open?id=")) {
      const match = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        url = `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }

    const fetch = (await import('node-fetch')).default || globalThis.fetch;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const base64 = buffer.toString("base64");
    const dataUri = `data:${contentType};base64,${base64}`;
    
    res.json({ success: true, base64: dataUri, contentType });
  } catch (error) {
    console.error("Error fetching URL:", error);
    res.status(500).json({ error: "Failed to fetch URL" });
  }
});

async function startServer() {

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
