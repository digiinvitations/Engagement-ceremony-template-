const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const fetchUrlCode = `
// 8. Fetch external URL to bypass CORS and convert to base64
app.post("/api/fetch-url", async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing URL" });
    
    // Transform Google Drive URL if needed
    if (url.includes("drive.google.com/file/d/")) {
      const match = url.match(/\\/d\\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        url = \`https://drive.google.com/uc?export=download&id=\${match[1]}\`;
      }
    } else if (url.includes("drive.google.com/open?id=")) {
      const match = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        url = \`https://drive.google.com/uc?export=download&id=\${match[1]}\`;
      }
    }

    const fetch = (await import('node-fetch')).default || globalThis.fetch;
    const response = await fetch(url);
    if (!response.ok) throw new Error(\`Failed to fetch: \${response.statusText}\`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const base64 = buffer.toString("base64");
    const dataUri = \`data:\${contentType};base64,\${base64}\`;
    
    res.json({ success: true, base64: dataUri, contentType });
  } catch (error) {
    console.error("Error fetching URL:", error);
    res.status(500).json({ error: "Failed to fetch URL" });
  }
});

async function startServer() {
`;

serverCode = serverCode.replace("async function startServer() {", fetchUrlCode);

fs.writeFileSync('server.ts', serverCode);
