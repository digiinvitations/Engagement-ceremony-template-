const fs = require("fs");
let text = fs.readFileSync("src/App.tsx", "utf8");

const startIdx = text.indexOf("  // Handle Audio Player\n  useEffect(() => {\n    let isCancelled = false;\n\n    if (!config.musicUrl) {\n      if (audioRef.current) {\n        audioRef.current.pause();\n      }\n      setActualMusicUrl(\"\");");
const endIdx = text.indexOf("  // Scroll to top state");

// Wait, the new code is before the old code?
text = text.substring(0, startIdx) + text.substring(endIdx);
fs.writeFileSync("src/App.tsx", text);
