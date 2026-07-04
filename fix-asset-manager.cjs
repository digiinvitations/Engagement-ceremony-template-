const fs = require('fs');

let text = fs.readFileSync('src/components/AssetManager.tsx', 'utf8');

text = text.replace(
  `import { Copy, UploadCloud, CheckCircle2, Image as ImageIcon, Music, Video, FileText } from "lucide-react";`,
  `import { Copy, UploadCloud, CheckCircle2, Image as ImageIcon, Music, Video, FileText, Link as LinkIcon, Loader2 } from "lucide-react";`
);

text = text.replace(
  `const [copiedId, setCopiedId] = useState<string | null>(null);`,
  `const [copiedId, setCopiedId] = useState<string | null>(null);\n  const [urlInput, setUrlInput] = useState("");\n  const [isUrlUploading, setIsUrlUploading] = useState(false);`
);

const handleUrlUploadStr = `
  const handleUrlUpload = async () => {
    if (!urlInput.trim()) return;
    setIsUrlUploading(true);
    try {
      const response = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch URL");
      
      const fsdbUrl = await uploadToFsdb(data.base64);
      setAssets(prev => [{ 
        id: Math.random().toString(36).slice(2), 
        url: fsdbUrl, 
        name: urlInput.split('/').pop() || "URL Upload", 
        type: data.contentType || "unknown" 
      }, ...prev]);
      setUrlInput("");
    } catch (err) {
      console.error("URL upload failed", err);
      alert(err instanceof Error ? err.message : "Failed to fetch URL.");
    }
    setIsUrlUploading(false);
  };
`;

text = text.replace(
  `const handleFileUpload = (file: File): Promise<string> => {`,
  `${handleUrlUploadStr}\n  const handleFileUpload = (file: File): Promise<string> => {`
);

const urlInputUiStr = `
      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          placeholder="Paste Image/Audio URL here..." 
          className="flex-1 bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-xs focus:border-pink-300 outline-none"
          onKeyDown={e => e.key === 'Enter' && handleUrlUpload()}
        />
        <button 
          onClick={handleUrlUpload}
          disabled={isUrlUploading || !urlInput.trim()}
          className="bg-gold-500/20 text-pink-900 px-3 py-2 rounded-lg hover:bg-gold-500/30 transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center"
        >
          {isUrlUploading ? <Loader2 size={16} className="animate-spin" /> : <LinkIcon size={16} />}
        </button>
      </div>
      
      <div className="relative border-2 border-dashed border-pink-300/50 rounded-2xl bg-white/40 hover:bg-pink-50/50 transition-colors p-4 text-center cursor-pointer mb-4 shrink-0">
`;

text = text.replace(
  `<div className="relative border-2 border-dashed border-pink-300/50 rounded-2xl bg-white/40 hover:bg-pink-50/50 transition-colors p-4 text-center cursor-pointer mb-4 shrink-0">`,
  urlInputUiStr
);

fs.writeFileSync('src/components/AssetManager.tsx', text);
