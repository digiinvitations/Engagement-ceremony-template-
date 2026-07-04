import React, { useState } from "react";
import { uploadToFsdb } from "../lib/fsdb";
import { Copy, UploadCloud, CheckCircle2, Image as ImageIcon, Music, Video, FileText, Link as LinkIcon, Loader2 } from "lucide-react";

interface UploadedAsset {
  id: string;
  url: string;
  name: string;
  type: string;
}

export const AssetManager: React.FC = () => {
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isUrlUploading, setIsUrlUploading] = useState(false);

  
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

  const handleFileUpload = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      if (file.type.startsWith("image/")) {
        reader.onload = (event) => {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            const maxDim = 1000;
            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL("image/webp", 0.7);
            try {
              const url = await uploadToFsdb(compressed);
              resolve(url);
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = async () => {
            const fb = new FileReader();
            fb.onloadend = async () => resolve(await uploadToFsdb(fb.result as string));
            fb.onerror = reject;
            fb.readAsDataURL(file);
          }
          img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        reader.onloadend = async () => resolve(await uploadToFsdb(reader.result as string));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
    });
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      try {
        const url = await handleFileUpload(file);
        setAssets(prev => [{ id: Math.random().toString(36).slice(2), url, name: file.name, type: file.type }, ...prev]);
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
    setIsUploading(false);
  };

  const copyToClipboard = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon size={16} className="text-pink-600" />;
    if (type.startsWith("audio/")) return <Music size={16} className="text-emerald-600" />;
    if (type.startsWith("video/")) return <Video size={16} className="text-blue-600" />;
    return <FileText size={16} className="text-gray-600" />;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-4">
        <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2 flex items-center gap-2">
          <UploadCloud size={20} className="text-gold-600" /> Asset Manager
        </h4>
        <p className="text-[10px] text-pink-800/60 mt-1">Upload files here and copy their URLs to use in the form settings.</p>
      </div>
      
      
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

        <input type="file" multiple onChange={onFileChange} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading} />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-pink-900 font-medium tracking-wide">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <UploadCloud size={24} className="text-pink-400" />
            <span className="text-xs text-pink-900 font-medium tracking-wide">Click or Drop Files</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-2">
        {assets.length === 0 ? (
          <div className="text-center py-8 text-xs text-pink-800/40 italic">
            No assets uploaded yet in this session.
          </div>
        ) : (
          assets.map(asset => (
            <div key={asset.id} className="bg-white/60 border border-pink-200/50 rounded-xl p-2.5 flex items-center gap-3 shadow-sm hover:shadow transition-all group">
              <div className="shrink-0 p-2 bg-pink-50 rounded-lg">
                {getIcon(asset.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate" title={asset.name}>{asset.name}</p>
                <p className="text-[9px] text-gray-500 truncate mt-0.5">{asset.type}</p>
              </div>
              <button 
                onClick={() => copyToClipboard(asset.id, asset.url)}
                className="shrink-0 p-1.5 rounded-md hover:bg-gold-50 text-gold-600 transition-colors bg-white border border-gold-200 shadow-sm"
                title="Copy URL"
              >
                {copiedId === asset.id ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
