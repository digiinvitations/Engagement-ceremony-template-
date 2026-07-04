const fs = require("fs");
let text = fs.readFileSync("src/App.tsx", "utf8");

text = text.replace(
  `        const url = await fetchFromFsdb(config.musicUrl);\n        if (isCancelled || !url) return;\n        setActualMusicUrl(url);`,
  `        let url = await fetchFromFsdb(config.musicUrl);\n        if (isCancelled || !url) return;\n        \n        // Convert data URL to Blob URL for better audio playback support\n        if (url.startsWith("data:audio")) {\n          try {\n            const parts = url.split(",");\n            const mime = parts[0].match(/:(.*?);/)[1];\n            const bstr = atob(parts[1]);\n            let n = bstr.length;\n            const u8arr = new Uint8Array(n);\n            while (n--) {\n              u8arr[n] = bstr.charCodeAt(n);\n            }\n            const blob = new Blob([u8arr], { type: mime });\n            url = URL.createObjectURL(blob);\n          } catch (e) {\n            console.error("Failed to convert audio base64 to blob", e);\n          }\n        }\n        \n        setActualMusicUrl(url);`
);

fs.writeFileSync("src/App.tsx", text);
