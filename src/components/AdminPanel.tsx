import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, Check, X, FileSpreadsheet, Trash2, Key, ChevronDown, ChevronUp, Image as ImageIcon, Calendar, Edit3, Settings, Video, Database, Map, Copy, AlertCircle, CheckCircle2 } from "lucide-react";
import { WeddingConfig } from "../weddingConfig";
import { uploadToFsdb } from "../lib/fsdb";
import { deleteLocalRsvp, clearAllLocalRsvps, fetchRsvpsFromDb } from "../lib/db";
import { FirestoreImage } from "./FirestoreImage";
import { AssetManager } from "./AssetManager";

interface RSVPRecord {
  id: string;
  name: string;
  phone: string;
  guestsCount: number;
  message: string;
  attend: boolean;
  timestamp: string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: WeddingConfig;
  onConfigChange: (newConfig: WeddingConfig) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, config, onConfigChange }) => {
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [rsvps, setRsvps] = useState<RSVPRecord[]>([]);
  
  const [activeTab, setActiveTab] = useState<"rsvps" | "couple" | "media" | "assets" | "events">("rsvps");

  // Local state for editing to avoid constant re-renders during typing
  const [editConfig, setEditConfig] = useState<WeddingConfig>(config);
  const [isDraggingMusic, setIsDraggingMusic] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    setEditConfig(config);
  }, [config]);

  // Auto-save changes in real time
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      // Avoid saving immediately on load, only save if editConfig actually differs
      if (JSON.stringify(editConfig) !== JSON.stringify(config)) {
        const timer = setTimeout(() => {
          onConfigChange(editConfig);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [editConfig, config, isAuthenticated, isOpen, onConfigChange]);

  // Load RSVPs from database
  useEffect(() => {
    if (isOpen) {
      const fetchLocalRSVPs = () => {
        try {
          const raw = localStorage.getItem("wedding_rsvps");
          const data = raw ? JSON.parse(raw) : [];
          setRsvps(data);
        } catch (err) {
          console.warn("Failed to fetch RSVPs from localStorage:", err);
        }
      };

      // Load locally immediately for fast initial rendering
      fetchLocalRSVPs();

      // Fetch from the server-side permanent storage
      fetchRsvpsFromDb();

      const handleRSVPUpdate = () => {
        fetchLocalRSVPs();
      };

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "wedding_rsvps") {
          fetchLocalRSVPs();
        }
      };

      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("storage_rsvps_updated", handleRSVPUpdate);

      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("storage_rsvps_updated", handleRSVPUpdate);
      };
    }
  }, [isOpen]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      setError("Maximum attempts reached. You are restricted from trying again.");
      return;
    }

    if (passcode === "4911") {
      setIsAuthenticated(true);
      setError("");
      setLoginAttempts(0);
    } else {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        setIsLocked(true);
        setError("Maximum attempts reached. You are restricted from trying again.");
      } else {
        setError(`Incorrect Passcode. You have ${3 - newAttempts} attempt(s) left.`);
      }
    }
  };

  const saveChanges = () => {
    onConfigChange(editConfig);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Convert File to Base64 (with automatic compression for images to respect Firestore 1MB limits)
  const handleImageUpload = (file: File, isHD = false): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            // Compress heavily for the free tier quota, but allow higher resolution (HD) for important screens
            const maxDim = isHD ? 2048 : 800; 
            const quality = isHD ? 0.92 : 0.7;

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
            if (!ctx) {
              reject(new Error("Canvas context is null"));
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            
            // Use webp to preserve transparency while keeping file size small
            const compressedBase64 = canvas.toDataURL("image/webp", quality);
            try {
              const fsdbUrl = await uploadToFsdb(compressedBase64);
              resolve(fsdbUrl);
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = async () => {
            // Fallback to original base64 if loading to image fails
            const fallbackReader = new FileReader();
            fallbackReader.onloadend = async () => {
              try {
                const fsdbUrl = await uploadToFsdb(fallbackReader.result as string);
                resolve(fsdbUrl);
              } catch (e) {
                reject(e);
              }
            };
            fallbackReader.onerror = reject;
            fallbackReader.readAsDataURL(file);
          };
          img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
             const fsdbUrl = await uploadToFsdb(reader.result as string);
             resolve(fsdbUrl);
          } catch (e) {
             reject(e);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, path: "bride" | "groom") => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await handleImageUpload(file);
        setEditConfig(prev => ({
          ...prev,
          [path]: {
            ...prev[path],
            imageUrl: base64
          }
        }));
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to process image.");
      }
    }
  };



  const addGalleryPhoto = () => {
    setEditConfig(prev => ({
      ...prev,
      galleryImages: [...prev.galleryImages, { url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop", caption: "New Photo" }]
    }));
  };

  const updateGalleryPhoto = (index: number, field: "url"|"caption", value: string) => {
    setEditConfig(prev => {
      const updated = [...prev.galleryImages];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, galleryImages: updated };
    });
  };

  const deleteGalleryPhoto = (index: number) => {
    setEditConfig(prev => {
      const updated = [...prev.galleryImages];
      updated.splice(index, 1);
      return { ...prev, galleryImages: updated };
    });
  };

  const processYouTubeUrl = (url: string) => {
    let embedUrl = url;
    if (url.includes("watch?v=")) {
      embedUrl = url.replace("watch?v=", "embed/");
      embedUrl = embedUrl.split("&")[0];
    } else if (url.includes("youtu.be/")) {
      embedUrl = url.replace("youtu.be/", "youtube.com/embed/");
      embedUrl = embedUrl.split("?")[0];
    } else if (url.includes("youtube.com/shorts/")) {
      embedUrl = url.replace("youtube.com/shorts/", "youtube.com/embed/");
      embedUrl = embedUrl.split("?")[0];
    }
    setEditConfig(p => ({...p, youtubeEmbedUrl: embedUrl}));
  };

  const handleClearAllRsvps = () => {
    if (window.confirm("Are you sure you want to delete all RSVP entries? This cannot be undone.")) {
      clearAllLocalRsvps();
      setRsvps([]);
    }
  };

  const handleDeleteRsvp = (id: string) => {
    if (window.confirm("Are you sure you want to delete this RSVP entry?")) {
      deleteLocalRsvp(id);
      setRsvps(prev => prev.filter(r => r.id !== id));
    }
  };

  const exportToCSV = () => {
    if (rsvps.length === 0) {
      alert("No RSVPs to export yet.");
      return;
    }

    const headers = ["Name", "Phone", "Status", "Guests Count", "Message", "Timestamp"];
    const rows = rsvps.map((r) => [
      r.name,
      r.phone,
      r.attend ? "Attending" : "Not Attending",
      r.guestsCount,
      `"${r.message.replace(/"/g, '""')}"`,
      new Date(r.timestamp).toLocaleString()
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "wedding_rsvps.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalAttending = rsvps
    .filter((r) => r.attend)
    .reduce((sum, r) => sum + Number(r.guestsCount), 0);
  const totalDeclined = rsvps.filter((r) => !r.attend).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="admin-panel-root"
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-4xl bg-white border border-pink-300 rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-pink-300/20 mb-4 shrink-0">
              <div>
                <h3 className="font-display text-xl text-pink-900 flex items-center gap-2">
                  <Settings size={22} className="text-pink-700" /> Host Dashboard
                </h3>
                <p className="text-[10px] text-pink-800/60 uppercase tracking-widest mt-0.5">
                  Manage Content & RSVPs
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-pink-800/60 hover:text-pink-900 text-xs uppercase tracking-wider font-semibold border border-pink-300/20 rounded-full px-4 py-1.5 cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>

            {!isAuthenticated ? (
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleLogin}
                className="flex flex-col items-center justify-center py-10 space-y-4 my-auto"
              >
                <div className="w-12 h-12 rounded-full bg-gold-400/10 flex items-center justify-center text-pink-700 mb-2">
                  <Key size={24} />
                </div>
                <h4 className="font-display text-lg text-pink-900">Enter Host Passcode</h4>
                <p className="text-xs text-pink-800/60 max-w-xs text-center">
                  Please enter the secret passcode to access the website management tools.
                </p>
                <div className="w-full max-w-xs relative">
                  <input
                    type="password"
                    placeholder="Enter Passcode"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    disabled={isLocked}
                    className={`w-full bg-pink-50/50 text-gray-900 border border-pink-300/30 rounded-xl px-4 py-3 text-center focus:outline-none focus:border-pink-300 text-sm tracking-widest placeholder:text-pink-700/30 font-semibold ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                    autoFocus
                  />
                </div>
                {error && <p className="text-pink-300 text-xs font-semibold px-2">{error}</p>}
                <button
                  type="submit"
                  disabled={isLocked}
                  className={`bg-gold-gradient text-white font-bold uppercase text-xs tracking-wider py-2.5 px-6 rounded-xl ${isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  Unlock Dashboard
                </button>
              </motion.form>
            ) : (
              <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
                {/* Sidebar Tabs */}
                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:w-48 shrink-0 pb-4 md:pb-0 md:pr-4 border-b md:border-b-0 md:border-r border-pink-300/20 mb-4 md:mb-0 scrollbar-none">
                  <button
                    onClick={() => setActiveTab("rsvps")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0 ${activeTab === "rsvps" ? "bg-gold-500/20 text-pink-900" : "text-pink-800/50 hover:bg-gold-500/10"}`}
                  >
                    <Users size={16} /> RSVPs
                  </button>
                  <button
                    onClick={() => setActiveTab("couple")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0 ${activeTab === "couple" ? "bg-gold-500/20 text-pink-900" : "text-pink-800/50 hover:bg-gold-500/10"}`}
                  >
                    <Edit3 size={16} /> Couple Info
                  </button>
                  <button
                    onClick={() => setActiveTab("events")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0 ${activeTab === "events" ? "bg-gold-500/20 text-pink-900" : "text-pink-800/50 hover:bg-gold-500/10"}`}
                  >
                    <Map size={16} /> Events
                  </button>

                  <button
                    onClick={() => setActiveTab("media")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0 ${activeTab === "media" ? "bg-gold-500/20 text-pink-900" : "text-pink-800/50 hover:bg-gold-500/10"}`}
                  >
                    <Video size={16} /> Teaser & Media </button>
                  <button onClick={() => setActiveTab("assets")} className={`xl:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0 ${activeTab === "assets" ? "bg-gold-500/20 text-pink-900" : "text-pink-800/50 hover:bg-gold-500/10"}`}> <Database size={16} /> Assets & Files
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto md:pl-4 scrollbar-thin pb-16 md:pb-0">
                  {activeTab === "rsvps" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
                      <div className="grid grid-cols-3 gap-3 mb-4 shrink-0">
                        <div className="bg-pink-50/40 border border-pink-300/10 p-3 rounded-2xl text-center">
                          <span className="text-[10px] text-pink-800/50 uppercase tracking-wider block">RSVPs</span>
                          <span className="text-xl md:text-2xl font-display text-pink-900 mt-1 block">{rsvps.length}</span>
                        </div>
                        <div className="bg-emerald-950/40 border border-emerald-500/20 p-3 rounded-2xl text-center">
                          <span className="text-[10px] text-emerald-300/60 uppercase tracking-wider block">Attending</span>
                          <span className="text-xl md:text-2xl font-display text-emerald-400 mt-1 block">{totalAttending}</span>
                        </div>
                        <div className="bg-rose-950/40 border border-rose-500/20 p-3 rounded-2xl text-center">
                          <span className="text-[10px] text-rose-300/60 uppercase tracking-wider block">Declined</span>
                          <span className="text-xl md:text-2xl font-display text-rose-400 mt-1 block">{totalDeclined}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mb-3 shrink-0">
                        <span className="text-xs text-pink-800/60 font-semibold">Guest Entries ({rsvps.length})</span>
                        <div className="flex gap-2">
                          <button onClick={exportToCSV} disabled={rsvps.length === 0} className="text-[11px] bg-emerald-700/80 hover:bg-emerald-600 disabled:opacity-40 text-gray-900 font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer">
                            <FileSpreadsheet size={13} /> Export
                          </button>
                          <button onClick={handleClearAllRsvps} disabled={rsvps.length === 0} className="text-[11px] bg-rose-800/80 hover:bg-rose-700 disabled:opacity-40 text-gray-900 font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer">
                            <Trash2 size={13} /> Reset
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto border border-pink-300/20 rounded-2xl bg-white/50">
                        {rsvps.length === 0 ? (
                          <div className="text-center py-12 text-pink-800/40 text-sm">No RSVPs have been submitted yet.</div>
                        ) : (
                          <div className="divide-y divide-gold-400/10">
                            {rsvps.map((record, i) => (
                              <div key={record.id ? `admin-rsvp-${record.id}-${i}` : `admin-rsvp-idx-${i}`} className="p-3.5 flex flex-col md:flex-row justify-between gap-2.5 items-start md:items-center">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-pink-900 text-sm">{record.name}</span>
                                    {record.attend ? (
                                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                        {record.guestsCount} Attending
                                      </span>
                                    ) : (
                                      <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/30">Declined</span>
                                    )}

                                  </div>
                                  <span className="text-xs text-pink-800/50 block mt-0.5">{record.phone}</span>
                                  {record.message && (
                                    <p className="text-xs text-pink-900/90 bg-pink-50/30 border border-pink-300/5 p-2 rounded-lg mt-2 italic">&ldquo;{record.message}&rdquo;</p>
                                  )}

                                </div>
                                <div className="flex items-center gap-3 self-start md:self-center">
                                  <span className="text-[10px] text-pink-800/30">{new Date(record.timestamp).toLocaleDateString()}</span>
                                  {record.id && (
                                    <button
                                      onClick={() => handleDeleteRsvp(record.id)}
                                      className="text-rose-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                                      title="Delete RSVP"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}

                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    </motion.div>
                  )}


                  {activeTab === "couple" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Groom Info */}
                        <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4">
                          <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2">Groom Details</h4>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Name</label>
                            <input type="text" value={editConfig.groom.name} onChange={e => setEditConfig(p => ({...p, groom: {...p.groom, name: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Father's Name</label>
                            <input type="text" value={editConfig.groom.fatherName} onChange={e => setEditConfig(p => ({...p, groom: {...p.groom, fatherName: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Mother's Name</label>
                            <input type="text" value={editConfig.groom.motherName} onChange={e => setEditConfig(p => ({...p, groom: {...p.groom, motherName: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Photo (ImgBB URL or Upload)</label>
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2 items-center">
                                <FirestoreImage src={editConfig.groom.imageUrl} alt="Groom" className="w-10 h-10 rounded-full object-cover border border-pink-300/30 shrink-0" />
                                <input type="text" value={editConfig.groom.imageUrl} onChange={e => setEditConfig(p => ({...p, groom: {...p.groom, imageUrl: e.target.value}}))} placeholder="https://i.ibb.co/..." className="flex-1 bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                              </div>
                              <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, "groom")} className="text-xs text-pink-800/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gold-500/20 file:text-pink-900 cursor-pointer" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Bio</label>
                            <textarea value={editConfig.groom.bio} onChange={e => setEditConfig(p => ({...p, groom: {...p.groom, bio: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none min-h-[80px]" />
                          </div>
                        </div>

                        {/* Bride Info */}
                        <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4">
                          <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2">Bride Details</h4>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Name</label>
                            <input type="text" value={editConfig.bride.name} onChange={e => setEditConfig(p => ({...p, bride: {...p.bride, name: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Father's Name</label>
                            <input type="text" value={editConfig.bride.fatherName} onChange={e => setEditConfig(p => ({...p, bride: {...p.bride, fatherName: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Mother's Name</label>
                            <input type="text" value={editConfig.bride.motherName} onChange={e => setEditConfig(p => ({...p, bride: {...p.bride, motherName: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Photo (ImgBB URL or Upload)</label>
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2 items-center">
                                <FirestoreImage src={editConfig.bride.imageUrl} alt="Bride" className="w-10 h-10 rounded-full object-cover border border-pink-300/30 shrink-0" />
                                <input type="text" value={editConfig.bride.imageUrl} onChange={e => setEditConfig(p => ({...p, bride: {...p.bride, imageUrl: e.target.value}}))} placeholder="https://i.ibb.co/..." className="flex-1 bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                              </div>
                              <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, "bride")} className="text-xs text-pink-800/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gold-500/20 file:text-pink-900 cursor-pointer" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Bio</label>
                            <textarea value={editConfig.bride.bio} onChange={e => setEditConfig(p => ({...p, bride: {...p.bride, bio: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none min-h-[80px]" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4">
                        <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2">General Engagement Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="col-span-1 md:col-span-2">
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Hero Section Tagline</label>
                            <input type="text" value={editConfig.heroTagline} onChange={e => setEditConfig(p => ({...p, heroTagline: e.target.value}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Ganesha Icon (Image Upload)</label>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={async (e) => {
                                if (e.target.files && e.target.files[0]) {
                                  try {
                                    const url = await handleImageUpload(e.target.files[0]);
                                    setEditConfig(p => ({
                                      ...p, 
                                      heroSettings: { ...p.heroSettings, ganeshaIconUrl: url }
                                    } as typeof editConfig));
                                  } catch(err) {
                                    console.error(err);
                                    alert("Image upload failed");
                                  }
                                }
                              }} 
                              className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" 
                            />
                            {editConfig.heroSettings?.ganeshaIconUrl && (
                              <img src={editConfig.heroSettings.ganeshaIconUrl} alt="Preview" className="h-16 mt-2 object-contain" />
                            )}

                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Hero Shloka (Sanskrit)</label>
                            <textarea value={editConfig.heroSettings?.shloka || ''} onChange={e => setEditConfig(p => ({...p, heroSettings: {...p.heroSettings, shloka: e.target.value}} as typeof editConfig))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none min-h-[80px]" />
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Hero Intro Text</label>
                            <textarea value={editConfig.heroSettings?.introText || ''} onChange={e => setEditConfig(p => ({...p, heroSettings: {...p.heroSettings, introText: e.target.value}} as typeof editConfig))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none min-h-[60px]" />
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Bride's Parents Text</label>
                            <input type="text" value={editConfig.heroSettings?.brideParents || ''} onChange={e => setEditConfig(p => ({...p, heroSettings: {...p.heroSettings, brideParents: e.target.value}} as typeof editConfig))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Groom's Parents Text</label>
                            <input type="text" value={editConfig.heroSettings?.groomParents || ''} onChange={e => setEditConfig(p => ({...p, heroSettings: {...p.heroSettings, groomParents: e.target.value}} as typeof editConfig))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div className="col-span-1 md:col-span-2 flex items-center gap-2">
                            <input type="checkbox" checked={editConfig.heroSettings?.showPetals ?? true} onChange={e => setEditConfig(p => ({...p, heroSettings: {...p.heroSettings, showPetals: e.target.checked}} as typeof editConfig))} className="w-4 h-4 text-pink-600 border-pink-300/30 rounded focus:ring-pink-500" />
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest">Show Falling Petals Animation</label>
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Display Date</label>
                            <input type="text" value={editConfig.displayDate} onChange={e => setEditConfig(p => ({...p, displayDate: e.target.value}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Countdown Target (YYYY-MM-DDTHH:mm:ss)</label>
                            <input type="text" value={editConfig.weddingDate} onChange={e => setEditConfig(p => ({...p, weddingDate: e.target.value}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Hashtag</label>
                            <input type="text" value={editConfig.hashtag} onChange={e => setEditConfig(p => ({...p, hashtag: e.target.value}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Envelope Icon Image (URL or Upload)</label>
                            <div className="flex gap-2">
                              <input type="text" value={editConfig.envelopeIconUrl || ""} onChange={e => setEditConfig(p => ({...p, envelopeIconUrl: e.target.value}))} placeholder="Leave empty for default Ganesha icon" className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                              <input type="file" accept="image/*" onChange={async (e) => {
                                if (e.target.files && e.target.files[0]) {
                                  try {
                                    const base64 = await handleImageUpload(e.target.files[0]);
                                    setEditConfig(prev => ({ ...prev, envelopeIconUrl: base64 }));
                                  } catch (err) {
                                    alert(err instanceof Error ? err.message : "Failed to process image.");
                                  }
                                }
                              }} className="text-xs text-pink-800/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gold-500/20 file:text-pink-900 cursor-pointer max-w-[120px]" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Thank You Portrait Image (URL or Upload)</label>
                            <div className="flex gap-2">
                              <input type="text" value={editConfig.thankYouImageUrl || ""} onChange={e => setEditConfig(p => ({...p, thankYouImageUrl: e.target.value}))} placeholder="Leave empty to use Gallery Image 1" className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                              <input type="file" accept="image/*" onChange={async (e) => {
                                if (e.target.files && e.target.files[0]) {
                                  try {
                                    const base64 = await handleImageUpload(e.target.files[0], true);
                                    setEditConfig(prev => ({ ...prev, thankYouImageUrl: base64 }));
                                  } catch (err) {
                                    alert(err instanceof Error ? err.message : "Failed to process image.");
                                  }
                                }
                              }} className="text-xs text-pink-800/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gold-500/20 file:text-pink-900 cursor-pointer max-w-[120px]" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Background Music (Google Drive URL / Upload)</label>
                            <div className="flex flex-col gap-2">
                              <input type="text" value={editConfig.musicUrl} onChange={e => setEditConfig(p => ({...p, musicUrl: e.target.value}))} placeholder="https://drive.google.com/file/d/..." className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                              <div
                                onDragOver={(e) => { e.preventDefault(); setIsDraggingMusic(true); }}
                                onDragLeave={() => setIsDraggingMusic(false)}
                                onDrop={async (e) => {
                                  e.preventDefault();
                                  setIsDraggingMusic(false);
                                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                    const file = e.dataTransfer.files[0];
                                    if (file.type.startsWith('audio/')) {
                                      try {
                                        const base64 = await handleImageUpload(file);
                                        setEditConfig(prev => ({ ...prev, musicUrl: base64 }));
                                      } catch (err) {
                                        alert(err instanceof Error ? err.message : "Failed to process audio file.");
                                      }
                                    } else {
                                      alert("Please drop an audio file.");
                                    }
                                  }
                                }}
                                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${isDraggingMusic ? 'border-pink-300 bg-gold-400/10' : 'border-pink-300/30 hover:border-pink-300/60'}`}
                              >
                                <input type="file" accept="audio/*" onChange={async (e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    try {
                                      const base64 = await handleImageUpload(e.target.files[0]);
                                      setEditConfig(prev => ({ ...prev, musicUrl: base64 }));
                                    } catch (err) {
                                      alert(err instanceof Error ? err.message : "Failed to process audio file.");
                                    }
                                  }
                                }} className="text-xs text-pink-800/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gold-500/20 file:text-pink-900 cursor-pointer w-full" />
                                <p className="text-xs text-pink-800/60 mt-2">or drag and drop audio file here</p>
                              </div>
                              
                              <div className="mt-3 bg-pink-500/5 p-3 rounded-xl border border-pink-300/10 space-y-2">
                                <span className="text-[10px] text-pink-800/80 font-bold uppercase tracking-widest block mb-1">Or Select a Ready-To-Use Premium Wedding Track:</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {[
                                    { name: "📯 Royal Shehnai", desc: "Auspicious & Celebratory", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
                                    { name: "🪈 Soulful Divine Flute", desc: "Romantic, Soft & Blissful", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
                                    { name: "🪕 Sacred Sitar Harmony", desc: "Elegant & Traditional", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
                                    { name: "🎸 Acoustic Romantic Love", desc: "Modern Sweet Instrumental", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" }
                                  ].map((track) => (
                                    <button
                                      key={track.url}
                                      type="button"
                                      onClick={() => {
                                        setEditConfig(p => ({ ...p, musicUrl: track.url }));
                                      }}
                                      className={`text-left p-2 rounded-lg border transition-all text-xs cursor-pointer ${
                                        editConfig.musicUrl === track.url
                                          ? "bg-pink-100 border-pink-400 text-pink-900 shadow-sm"
                                          : "bg-white/40 border-pink-300/20 text-gray-700 hover:bg-white/70 hover:border-pink-300/40"
                                      }`}
                                    >
                                      <div className="font-semibold">{track.name}</div>
                                      <div className="text-[9px] text-gray-500">{track.desc}</div>
                                    </button>
                                  ))}
                                </div>
                                <div className="text-[10px] text-amber-800 mt-1 leading-relaxed">
                                  <p className="text-[9px] text-pink-800/60 mt-1">Files are chunked automatically to support larger sizes.</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4">
                        <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2">Footer Details</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Footer Message</label>
                            <textarea value={editConfig.familyDetails.message} onChange={e => setEditConfig(p => ({...p, familyDetails: {...p.familyDetails, message: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none min-h-[60px]" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Welcoming Text</label>
                            <input type="text" value={editConfig.familyDetails.welcomingText} onChange={e => setEditConfig(p => ({...p, familyDetails: {...p.familyDetails, welcomingText: e.target.value}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Family Names (Comma separated)</label>
                            <input type="text" value={editConfig.familyDetails.names.join(', ')} onChange={e => setEditConfig(p => ({...p, familyDetails: {...p.familyDetails, names: e.target.value.split(',').map(s => s.trim())}}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                          </div>
                        </div>
                      </div>

                      <button onClick={saveChanges} className="w-full bg-gold-gradient text-white font-bold uppercase text-sm tracking-wider py-3 rounded-xl cursor-pointer">
                        Save Changes
                      </button>
                    </motion.div>
                  )}




                  {activeTab === "assets" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col xl:hidden">
                      <AssetManager />
                    </motion.div>
                  )}

                  {activeTab === "events" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-6">
                      <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4">
                        <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2">Engagement Event Details</h4>
                        
                        <div>
                          <label className="block text-xs font-semibold text-pink-800 uppercase tracking-wider mb-1.5 ml-1">Venue Name</label>
                          <input 
                            type="text" 
                            className="w-full bg-white/70 border border-pink-200 rounded-xl px-4 py-2.5 text-pink-900 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-all"
                            value={editConfig.engagementDetails.venueName || ""}
                            onChange={(e) => setEditConfig(p => ({...p, engagementDetails: {...p.engagementDetails, venueName: e.target.value}}))}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-semibold text-pink-800 uppercase tracking-wider mb-1.5 ml-1">Venue Address</label>
                          <input 
                            type="text" 
                            className="w-full bg-white/70 border border-pink-200 rounded-xl px-4 py-2.5 text-pink-900 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-all"
                            value={editConfig.engagementDetails.venueAddress || ""}
                            onChange={(e) => setEditConfig(p => ({...p, engagementDetails: {...p.engagementDetails, venueAddress: e.target.value}}))}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-semibold text-pink-800 uppercase tracking-wider mb-1.5 ml-1">Event Time</label>
                          <input 
                            type="text" 
                            className="w-full bg-white/70 border border-pink-200 rounded-xl px-4 py-2.5 text-pink-900 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-all"
                            value={editConfig.engagementDetails.time || ""}
                            onChange={(e) => setEditConfig(p => ({...p, engagementDetails: {...p.engagementDetails, time: e.target.value}}))}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-semibold text-pink-800 uppercase tracking-wider mb-1.5 ml-1">Google Maps Embed URL</label>
                          <input 
                            type="text" 
                            className="w-full bg-white/70 border border-pink-200 rounded-xl px-4 py-2.5 text-pink-900 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-all"
                            value={editConfig.engagementDetails.mapEmbedUrl || ""}
                            onChange={(e) => setEditConfig(p => ({...p, engagementDetails: {...p.engagementDetails, mapEmbedUrl: e.target.value}}))}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-semibold text-pink-800 uppercase tracking-wider mb-1.5 ml-1">Google Maps Directions Link</label>
                          <input 
                            type="text" 
                            className="w-full bg-white/70 border border-pink-200 rounded-xl px-4 py-2.5 text-pink-900 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-all"
                            value={editConfig.engagementDetails.mapDirectionsUrl || ""}
                            onChange={(e) => setEditConfig(p => ({...p, engagementDetails: {...p.engagementDetails, mapDirectionsUrl: e.target.value}}))}
                          />
                        </div>
                      </div>
                      
                      <button onClick={saveChanges} className="w-full bg-gold-gradient text-white font-bold uppercase text-sm tracking-wider py-3 rounded-xl cursor-pointer">
                        Save Changes
                      </button>
                    </motion.div>
                  )}
                  {activeTab === "media" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-6">
                      <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4">
                        <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2">Opening Screen Setup</h4>
                        
                        <div>
                          <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Opening Background Image</label>
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                              <FirestoreImage src={editConfig.openingBackgroundImageUrl} alt="Opening Bg" className="w-20 h-12 rounded object-contain bg-black/20 border border-pink-300/30 shrink-0" />
                              <input type="text" value={editConfig.openingBackgroundImageUrl} onChange={e => setEditConfig(prev => ({...prev, openingBackgroundImageUrl: e.target.value}))} placeholder="https://i.ibb.co/..." className="flex-1 bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                            </div>
                            <input type="file" accept="image/*" onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                try {
                                  const base64 = await handleImageUpload(e.target.files[0], true);
                                  setEditConfig(prev => ({ ...prev, openingBackgroundImageUrl: base64 }));
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : "Failed to process image.");
                                }
                              }
                            }} className="text-xs text-pink-800/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gold-500/20 file:text-pink-900 cursor-pointer" />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Opening Seal Image (Circular, Transparent BG)</label>
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                              <FirestoreImage src={editConfig.openingSealImageUrl} alt="Seal" className="w-12 h-12 rounded-full object-contain bg-black/20 border border-pink-300/30 shrink-0" />
                              <input type="text" value={editConfig.openingSealImageUrl} onChange={e => setEditConfig(prev => ({...prev, openingSealImageUrl: e.target.value}))} placeholder="https://i.ibb.co/..." className="flex-1 bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                            </div>
                            <input type="file" accept="image/*" onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                try {
                                  const base64 = await handleImageUpload(e.target.files[0]);
                                  setEditConfig(prev => ({ ...prev, openingSealImageUrl: base64 }));
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : "Failed to process image.");
                                }
                              }
                            }} className="text-xs text-pink-800/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gold-500/20 file:text-pink-900 cursor-pointer" />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Opening Full Screen Video (URL or Upload, ~6 seconds)</label>
                          <div className="flex flex-col gap-2">
                            <input type="text" value={editConfig.openingVideoUrl} onChange={e => setEditConfig(prev => ({...prev, openingVideoUrl: e.target.value}))} placeholder="https://example.com/video.mp4" className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                            <input type="file" accept="video/mp4,video/webm" onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                try {
                                  // Base64 upload logic is the same, but let's just use handleImageUpload which returns data URL
                                  const base64 = await handleImageUpload(e.target.files[0]);
                                  setEditConfig(prev => ({ ...prev, openingVideoUrl: base64 }));
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : "Failed to process video.");
                                }
                              }
                            }} className="text-xs text-pink-800/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gold-500/20 file:text-pink-900 cursor-pointer" />
                            <p className="text-[9px] text-pink-800/60">For best performance, paste a direct video URL instead of uploading.</p>
                          </div>
                        </div>
                      </div>



                      <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4">
                        <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2 flex justify-between items-center">
                          Teaser Video Configuration
                          {editConfig.youtubeEmbedUrl && (
                            <button onClick={() => processYouTubeUrl("")} className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-xs uppercase tracking-widest cursor-pointer font-sans">
                              <Trash2 size={12} /> Remove Video
                            </button>
                          )}

                        </h4>
                        <div>
                          <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">YouTube Video Link (Paste regular link or embed link)</label>
                          <input 
                            type="text" 
                            value={editConfig.youtubeEmbedUrl} 
                            onChange={e => processYouTubeUrl(e.target.value)} 
                            placeholder="e.g. https://www.youtube.com/watch?v=XXXXXXX"
                            className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" 
                          />
                          <p className="text-[10px] text-amber-400/80 mt-2 font-medium">To disable the video section entirely, simply clear this input field and save.</p>
                        </div>
                        {editConfig.youtubeEmbedUrl && (
                          <div className="aspect-video w-full max-w-sm rounded-lg overflow-hidden border border-pink-300/30 mt-4">
                            <iframe className="w-full h-full" src={editConfig.youtubeEmbedUrl} frameBorder="0" allowFullScreen />
                          </div>
                        )}

                      </div>

                      <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-300/10 space-y-4">
                        <h4 className="font-display text-pink-900 text-lg border-b border-pink-300/20 pb-2">Photo Gallery Setup</h4>
                        <div>
                          <label className="text-[10px] text-pink-800/70 uppercase tracking-widest block mb-1">Gallery Subtitle</label>
                          <input type="text" value={editConfig.gallerySubtitle} onChange={e => setEditConfig(p => ({...p, gallerySubtitle: e.target.value}))} className="w-full bg-white/50 text-gray-900 border border-pink-300/30 rounded-lg px-3 py-2 text-sm focus:border-pink-300 outline-none" />
                        </div>
                        <div className="space-y-4 mt-4">
                          {editConfig.galleryImages.map((img, idx) => (
                            <div key={`admin-gallery-${idx}`} className="flex gap-4 items-center bg-white/40 p-3 rounded-xl border border-pink-300/10 relative">
                              <FirestoreImage src={img.url} className="w-16 h-16 rounded object-contain bg-black/20 border border-pink-300/20 shrink-0" alt="" />
                              <div className="flex-1 space-y-2">
                                <input type="text" value={img.caption} onChange={e => updateGalleryPhoto(idx, "caption", e.target.value)} placeholder="Caption" className="w-full bg-pink-50/50 text-gray-900 border border-pink-300/20 rounded-lg px-2 py-1.5 text-xs focus:border-pink-300 outline-none" />
                                <div className="flex gap-2 items-center">
                                  <input type="text" value={img.url} onChange={e => updateGalleryPhoto(idx, "url", e.target.value)} placeholder="ImgBB URL (or Upload Base64)" className="w-full bg-pink-50/50 text-gray-900 border border-pink-300/20 rounded-lg px-2 py-1.5 text-[10px] focus:border-pink-300 outline-none" />
                                  <input type="file" accept="image/*" onChange={async (e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      try {
                                        const base64 = await handleImageUpload(e.target.files[0]);
                                        updateGalleryPhoto(idx, "url", base64);
                                      } catch (err) {
                                        alert(err instanceof Error ? err.message : "Failed to process image.");
                                      }
                                    }
                                  }} className="text-[9px] text-pink-800/60 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-gold-500/20 file:text-pink-900 cursor-pointer max-w-[120px]" />
                                </div>
                              </div>
                              <button onClick={() => deleteGalleryPhoto(idx)} className="text-rose-400 hover:text-rose-300 p-2 cursor-pointer transition-colors absolute top-2 right-2">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          <button onClick={addGalleryPhoto} className="w-full bg-gold-500/10 hover:bg-gold-500/20 text-pink-900 border border-pink-300/30 font-bold uppercase text-sm tracking-wider py-2 rounded-lg cursor-pointer transition-colors">
                            + Add Photo
                          </button>
                        </div>
                      </div>

                      <button onClick={saveChanges} className="w-full bg-gold-gradient text-white font-bold uppercase text-sm tracking-wider py-3 rounded-xl cursor-pointer">
                        Save Media Settings
                      </button>
                    </motion.div>
                  )}

                </div>
                {/* NEW: Dedicated File Uploader Column */}
                <div className="hidden xl:flex w-80 bg-pink-50/20 border-l border-pink-300/20 rounded-xl p-4 flex-col h-full overflow-hidden shrink-0">
                  <AssetManager />
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 border border-emerald-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Changes Saved Successfully!
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

