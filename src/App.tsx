import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FirestoreImage } from "./components/FirestoreImage";
import { fetchFromFsdb } from "./lib/fsdb";
import {
  Calendar,
  MapPin,
  Clock,
  ChevronUp,
  Heart,
  Send,
  Users,
  Phone,
  User,
  MessageSquare,
  Volume2,
  VolumeX,
  Lock,
  Settings,
  ExternalLink,
  Instagram,
  Facebook,
  Maximize2,
  Flower2
} from "lucide-react";

import { weddingConfig as defaultWeddingConfig, WeddingConfig } from "./weddingConfig";
import { GaneshaIcon } from "./components/GaneshaIcon";
import { OrnateFrame } from "./components/OrnateFrame";
import { EnvelopeCover } from "./components/EnvelopeCover";
import { RSVPModal } from "./components/RSVPModal";
import { AdminPanel } from "./components/AdminPanel";
import { ScratchReveal } from "./components/ScratchReveal";
import { FallingFlowers } from "./components/FallingFlowers";
import { FallingPetals } from "./components/FallingPetals";
import { SectionSeparator } from "./components/SectionSeparator";
import confetti from "canvas-confetti";

import { saveConfigToDb, addRsvpToDb, fetchConfigFromDb } from "./lib/db";

const TurbanIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 4C8 4 5 7 5 11C5 12 5.5 13.5 7 15L12 17L17 15C18.5 13.5 19 12 19 11C19 7 16 4 12 4Z" fill="currentColor" opacity="0.9"/>
    <path d="M7 15C6 16 5 17 5 19C5 21 8 22 12 22C16 22 19 21 19 19C19 17 18 16 17 15L12 17L7 15Z" fill="currentColor" opacity="0.7"/>
    <path d="M12 4L13.5 1L12 2L10.5 1L12 4Z" fill="#dec47f" />
    <circle cx="12" cy="8" r="2" fill="#dec47f" />
  </svg>
);

const BindiIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="14" r="3.5" fill="#dc2626" />
    <circle cx="12" cy="7" r="1.5" fill="currentColor" />
    <circle cx="12" cy="3" r="1" fill="currentColor" />
    <circle cx="17" cy="11" r="1" fill="currentColor" />
    <circle cx="7" cy="11" r="1" fill="currentColor" />
  </svg>
);

export default function App() {
  // Config state for dynamic management
  const [config, setConfig] = useState<WeddingConfig>(() => {
    try {
      const stored = localStorage.getItem("wedding_config");
      if (stored) {
        const configData = JSON.parse(stored);
        return {
          ...defaultWeddingConfig,
          ...configData,
          engagementDetails: configData.engagementDetails || defaultWeddingConfig.engagementDetails,
          galleryImages: configData.galleryImages || defaultWeddingConfig.galleryImages,
          groom: { ...defaultWeddingConfig.groom, ...(configData.groom || {}) },
          bride: { ...defaultWeddingConfig.bride, ...(configData.bride || {}) },
        };
      }
    } catch (e) {
      console.warn("Failed to load config from localStorage", e);
    }
    return defaultWeddingConfig;
  });

  useEffect(() => {
    // 1. Fetch permanent config from backend server on mount
    fetchConfigFromDb().then((serverConfig) => {
      if (serverConfig) {
        setConfig({
          ...defaultWeddingConfig,
          ...serverConfig,

          engagementDetails: serverConfig.engagementDetails || defaultWeddingConfig.engagementDetails,
          galleryImages: serverConfig.galleryImages || defaultWeddingConfig.galleryImages,
          groom: { ...defaultWeddingConfig.groom, ...(serverConfig.groom || {}) },
          bride: { ...defaultWeddingConfig.bride, ...(serverConfig.bride || {}) },
        });
      }
    });
  }, []);

  useEffect(() => {
    // Synchronize configuration changes across instances/tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "wedding_config" && e.newValue) {
        try {
          const configData = JSON.parse(e.newValue);
          setConfig({
            ...defaultWeddingConfig,
            ...configData,

            engagementDetails: configData.engagementDetails || defaultWeddingConfig.engagementDetails,
            galleryImages: configData.galleryImages || defaultWeddingConfig.galleryImages,
            groom: { ...defaultWeddingConfig.groom, ...(configData.groom || {}) },
            bride: { ...defaultWeddingConfig.bride, ...(configData.bride || {}) },
          });
        } catch (err) {
          console.warn("Failed to parse storage update", err);
        }
      }
    };
    
    // Custom event to handle updates within the same window
    const handleLocalConfigUpdate = () => {
      try {
        const stored = localStorage.getItem("wedding_config");
        if (stored) {
          const configData = JSON.parse(stored);
          setConfig({
            ...defaultWeddingConfig,
            ...configData,

            engagementDetails: configData.engagementDetails || defaultWeddingConfig.engagementDetails,
            galleryImages: configData.galleryImages || defaultWeddingConfig.galleryImages,
            groom: { ...defaultWeddingConfig.groom, ...(configData.groom || {}) },
            bride: { ...defaultWeddingConfig.bride, ...(configData.bride || {}) },
          });
        }
      } catch (err) {
        console.warn("Failed to parse local config update", err);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("wedding_config_updated", handleLocalConfigUpdate);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("wedding_config_updated", handleLocalConfigUpdate);
    };
  }, []);

  const handleConfigChange = async (newConfig: WeddingConfig) => {
    setConfig(newConfig);
    try {
      await saveConfigToDb(newConfig);
    } catch (e) {
      console.error("Failed to save config.", e);
      alert("Failed to save changes: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  // Opening flow states
  const [isOpened, setIsOpened] = useState(false);
  const [isDateRevealed, setIsDateRevealed] = useState(false);
  const [isMonthRevealed, setIsMonthRevealed] = useState(false);
  const [isYearRevealed, setIsYearRevealed] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);

  const allHeartsScratched = isDateRevealed && isMonthRevealed && isYearRevealed;
  const musicPlayingRef = useRef(musicPlaying);
  
  // Parse wedding date parts safely
  const dObj = new Date(config.weddingDate);
  let dateOfMarry = "12th";
  let monthOfMarry = "December";
  let yearOfMarry = "2026";

  if (!isNaN(dObj.getTime())) {
    const dayNum = dObj.getDate();
    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    dateOfMarry = getOrdinal(dayNum);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    monthOfMarry = months[dObj.getMonth()];
    yearOfMarry = dObj.getFullYear().toString();
  } else if (config.displayDate) {
    const cleaned = config.displayDate.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*/i, '');
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 3) {
      dateOfMarry = parts[0];
      monthOfMarry = parts[1].substring(0, 3);
      yearOfMarry = parts[2];
    }
  }
  
  useEffect(() => {
    musicPlayingRef.current = musicPlaying;
  }, [musicPlaying]);

  // Celebration animation when hearts are scratched
  useEffect(() => {
    if (allHeartsScratched) {
      const duration = 4000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 8,
          angle: 60,
          spread: 80,
          origin: { x: 0, y: 0.8 },
          colors: ['#fcd34d', '#f87171', '#c084fc', '#f472b6', '#ffffff']
        });
        confetti({
          particleCount: 8,
          angle: 120,
          spread: 80,
          origin: { x: 1, y: 0.8 },
          colors: ['#fcd34d', '#f87171', '#c084fc', '#f472b6', '#ffffff']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [allHeartsScratched]);



  // RSVP Form states
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpPhone, setRsvpPhone] = useState("");
  const [rsvpGuests, setRsvpGuests] = useState(1);
  const [rsvpAttend, setRsvpAttend] = useState<boolean | null>(true); // default attending
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [showRsvpModal, setShowRsvpModal] = useState(false);

  // Host Dashboard / Admin state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [actualMusicUrl, setActualMusicUrl] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Handle Audio Player
  useEffect(() => {
    let isCancelled = false;

    if (!config.musicUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setActualMusicUrl("");
      return;
    }

    const loadAudio = async () => {
      try {
        let url = await fetchFromFsdb(config.musicUrl);
        if (isCancelled || !url) return;
        
        // Convert data URL to Blob URL for better audio playback support
        if (url.startsWith("data:audio")) {
          try {
            const parts = url.split(",");
            const mime = parts[0].match(/:(.*?);/)[1];
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            url = URL.createObjectURL(blob);
          } catch (e) {
            console.error("Failed to convert audio base64 to blob", e);
          }
        }
        
        setActualMusicUrl(url);
      } catch (e) {
        console.log("Failed to load audio", e);
      }
    };
    loadAudio();

    return () => {
      isCancelled = true;
    };
  }, [config.musicUrl]);

  // Handle auto-play when url changes and it should be playing
  useEffect(() => {
    if (actualMusicUrl && musicPlaying && audioRef.current) {
      audioRef.current.play().catch(e => console.log("Audio play blocked", e));
    }
  }, [actualMusicUrl, musicPlaying]);

  // Handle Scroll Progress & Scroll-to-Top visibility
  useEffect(() => {
    const handleScroll = () => {
      // Show scroll-to-top button after 500px scroll
      setShowScrollTop(window.scrollY > 500);

      // Scroll progress percentage
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  const handleStartMusic = () => {
    setMusicPlaying(true);
    // Try to auto-play background shehnai music
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => setMusicPlaying(true))
        .catch((error) => {
          console.log("Audio play blocked by browser. User interaction should allow it.", error);
          // Set to playing state anyway so the user sees play toggle works on next action
          setMusicPlaying(true);
          // Retry playing on body tap
          const retryPlay = () => {
            audioRef.current?.play().then(() => {
              setMusicPlaying(true);
              document.body.removeEventListener("click", retryPlay);
            }).catch(e => {
              console.log("Retry play failed:", e);
              document.body.removeEventListener("click", retryPlay);
            });
          };
          document.body.addEventListener("click", retryPlay);
        });
    }
  };

  // Handle opening the envelope
  const handleOpenEnvelope = () => {
    setIsOpened(true);
  };

  // Toggle Background Music
  const toggleMusic = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    if (musicPlaying) {
      audioRef.current?.pause();
      setMusicPlaying(false);
    } else {
      audioRef.current?.play()
        .then(() => setMusicPlaying(true))
        .catch(err => console.log("Could not play audio", err));
    }
  };

  // Scroll to target section smoothly
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Handle RSVP Submission
  const handleRSVPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim() || !rsvpPhone.trim() || rsvpAttend === null) {
      alert("Please fill in your Name, Phone Number, and RSVP Status.");
      return;
    }

    // Save RSVP to database
    const newRsvp = {
      name: rsvpName,
      phone: rsvpPhone,
      guestsCount: rsvpAttend ? rsvpGuests : 0,
      attend: rsvpAttend,
      message: rsvpMessage,
      timestamp: new Date().toISOString()
    };

    addRsvpToDb(newRsvp)
      .then(() => {
        // Show Confirmation Modal
        setShowRsvpModal(true);
        if (rsvpAttend) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#dec47f', '#962325', '#f8d98d']
          });
        }
      })
      .catch(err => {
        console.error("Error adding RSVP: ", err);
        alert("Failed to submit RSVP: " + (err instanceof Error ? err.message : String(err)));
      });
  };

  const handleModalClose = () => {
    setShowRsvpModal(false);
    // Reset RSVP Form (excluding attend status for UX)
    setRsvpName("");
    setRsvpPhone("");
    setRsvpGuests(1);
    setRsvpMessage("");
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFF8F3] bg-gradient-to-b from-[#FFF8F3] to-[#ffece0] font-sans relative text-gray-800">
      
      <audio ref={audioRef} src={actualMusicUrl || undefined} loop preload="auto" playsInline className="hidden" onError={(e) => console.warn("Audio could not load.")} onPlay={() => console.log("Audio playing!")} />
      
      {/* 1. OVERLAY ENVELOPE COVER (Opening Screen) */}
      <AnimatePresence>
        {!isOpened && (
          <EnvelopeCover
            key="envelope"
            isOpen={isOpened}
            onOpen={handleOpenEnvelope}
            onSealTap={handleStartMusic}
            openingBackgroundImageUrl={config.openingBackgroundImageUrl}
            openingSealImageUrl={config.openingSealImageUrl}
            openingVideoUrl={config.openingVideoUrl}
          />
        )}
      </AnimatePresence>

      {/* BACKGROUND DECORATIVE MANDALAS (for luxury depth) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] left-[-150px] w-[400px] h-[400px] rounded-full border border-gold-400/10 flex items-center justify-center">
          <div className="w-[300px] h-[300px] rounded-full border border-dashed border-gold-400/5 animate-[spin_120s_linear_infinite]" />
        </div>
        <div className="absolute top-[50%] right-[-150px] w-[400px] h-[400px] rounded-full border border-gold-400/10 flex items-center justify-center">
          <div className="w-[300px] h-[300px] rounded-full border border-dashed border-gold-400/5 animate-[spin_100s_linear_reverse_infinite]" />
        </div>
        <div className="absolute bottom-[10%] left-[-100px] w-[300px] h-[300px] rounded-full border border-gold-400/5" />
      </div>

      {/* SCROLL PROGRESS INDICATOR BAR */}
      <div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-gold-600 via-gold-400 to-gold-200 z-50 shadow-md transition-all duration-100"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* MAIN LAYOUT WRAPPER (Fade in after envelope opens) */}
      <div className={`${isOpened ? "opacity-100" : "opacity-0 pointer-events-none"} transition-opacity duration-1000 relative z-10`}>
        
        {/* Global Falling Petals */}
        <FallingPetals active={config.heroSettings?.showPetals ?? true} count={40} className="z-[100]" />

        {/* 3. HERO SECTION */}
        <section id="hero" className="relative min-h-[100dvh] flex flex-col justify-center items-center text-center px-4 overflow-hidden bg-[#FFF8F3] bg-gradient-to-b from-[#FFF8F3] to-[#ffece0]">
          
          {/* Subtle radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_0%,transparent_60%)] z-0" />
          
          {/* Gold decorative corners */}
          <div className="absolute top-4 left-4 w-16 h-16 border-t-[1px] border-l-[1px] border-amber-400/60 z-0" />
          <div className="absolute top-4 right-4 w-16 h-16 border-t-[1px] border-r-[1px] border-amber-400/60 z-0" />
          <div className="absolute bottom-4 left-4 w-16 h-16 border-b-[1px] border-l-[1px] border-amber-400/60 z-0" />
          <div className="absolute bottom-4 right-4 w-16 h-16 border-b-[1px] border-r-[1px] border-amber-400/60 z-0" />

          {/* Invitation Card */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 1 }}
            className="relative z-10 w-full max-w-lg bg-white/60 backdrop-blur-md rounded-[40px] md:rounded-[60px] border-[1px] border-amber-300/40 shadow-[0_20px_40px_-15px_rgba(122,64,70,0.15)] px-6 py-8 md:py-16 my-8 md:my-16 flex flex-col items-center"
          >
            {/* Inner Border */}
            <div className="absolute inset-3 md:inset-4 border-[0.5px] border-amber-400/30 rounded-[30px] md:rounded-[46px] pointer-events-none" />

            {/* Ganesha Icon */}
            {config.heroSettings?.ganeshaIconUrl ? (
              <FirestoreImage src={config.heroSettings.ganeshaIconUrl} alt="Ganesha Icon" className="w-16 h-16 md:w-20 md:h-20 object-contain opacity-80 mb-6" />
            ) : (
              <GaneshaIcon className="w-16 h-16 md:w-20 md:h-20 text-amber-600 opacity-90 mb-6" />
            )}

            {/* Shloka */}
            {config.heroSettings?.shloka && (
              <div className="mb-6 md:mb-8 whitespace-pre-line text-xs md:text-base font-serif text-gray-800 leading-relaxed font-medium">
                {config.heroSettings.shloka}
              </div>
            )}

            {/* Intro Text */}
            {config.heroSettings?.introText && (
              <p className="font-serif italic text-gray-500 max-w-[80%] mx-auto text-sm md:text-base leading-relaxed mb-6 md:mb-8">
                {config.heroSettings.introText}
              </p>
            )}

            {/* Top Heading */}
            {config.heroTagline && (
              <p className="font-sans text-[10px] md:text-xs uppercase tracking-[0.4em] text-amber-700/80 mb-6 font-semibold">
                {config.heroTagline}
              </p>
            )}

            {/* Couple Names */}
            <div className="flex flex-col items-center gap-4 mb-10 w-full">
              <h1 className="font-display text-5xl md:text-6xl text-[#7A4046] tracking-wide m-0">
                {config.bride.name}
              </h1>
              <div className="flex items-center justify-center w-full gap-4 opacity-70">
                <div className="h-[1px] bg-amber-400/50 flex-grow max-w-[60px]" />
                <span className="font-serif text-xl md:text-2xl text-amber-600 italic">
                  &amp;
                </span>
                <div className="h-[1px] bg-amber-400/50 flex-grow max-w-[60px]" />
              </div>
              <h1 className="font-display text-5xl md:text-6xl text-[#7A4046] tracking-wide m-0">
                {config.groom.name}
              </h1>
            </div>

            {/* Parents Info */}
            <div className="flex flex-col gap-3 font-serif italic text-gray-600 text-xs md:text-sm tracking-wide">
              {config.heroSettings?.brideParents && (
                <p>{config.heroSettings.brideParents}</p>
              )}
              {config.heroSettings?.groomParents && (
                <p>{config.heroSettings.groomParents}</p>
              )}
            </div>

          </motion.div>

          {/* Scroll Prompt Arrow */}
          <div className="absolute bottom-8 z-10 flex flex-col items-center cursor-pointer select-none text-gray-400" onClick={() => scrollToSection("scratch-reveal")}>
            <span className="font-sans text-[9px] uppercase tracking-[0.3em] drop-shadow-sm mb-2">
              Scroll
            </span>
            <div className="w-4 h-4 border-b-[1.5px] border-r-[1.5px] border-gray-400 rotate-45 animate-bounce" />
          </div>
        </section>

        {/* SCRATCH CARD REVEAL SECTION */}
        <motion.section 
          id="scratch-reveal" 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="py-16 px-4 md:px-8 max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center"
        >
          {/* Beautiful "SAVE THE DATE ❤️" Tagline */}
          <div className="mb-6 md:mb-8">
            <span className="font-display text-2xl md:text-4xl text-red-600 tracking-[0.2em] font-extrabold drop-shadow-md flex items-center justify-center gap-2">
              SAVE THE DATE ❤️
            </span>
            <p className="text-xs font-sans text-gold-700/80 uppercase tracking-[0.3em] font-semibold mt-1.5">
              Scratch the hearts to reveal
            </p>
            <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-gold-500 to-transparent mx-auto mt-3" />
          </div>

          {/* 3 Red Hearts container */}
          <div className="flex flex-row flex-nowrap justify-center items-center gap-4 sm:gap-6 md:gap-8 px-2 py-4 w-full overflow-x-auto no-scrollbar">
            {/* Heart 1: Date */}
            <div className="flex flex-col items-center shrink-0">
              <span className="font-sans text-[11px] sm:text-xs uppercase tracking-[0.2em] text-gold-300 font-extrabold mb-2.5 drop-shadow-sm">
                DATE
              </span>
              <div className="p-1.5 bg-white/5 rounded-2xl border border-gold-500/15 shadow-xl inline-block">
                <ScratchReveal
                  width={90}
                  height={90}
                  onReveal={() => setIsDateRevealed(true)}
                  content={
                    <div className={`w-[76px] h-[76px] rounded-full flex items-center justify-center p-1 overflow-hidden transition-all duration-500 ${
                      isDateRevealed 
                        ? "bg-rose-50 border border-pink-200/50 shadow-inner" 
                        : "bg-transparent border-transparent"
                    }`}>
                      <span className="font-sans text-xs sm:text-sm font-black text-pink-600 tracking-wide leading-none drop-shadow-sm">
                        {dateOfMarry}
                      </span>
                    </div>
                  }
                />
              </div>
            </div>

            {/* Heart 2: Month */}
            <div className="flex flex-col items-center shrink-0">
              <span className="font-sans text-[11px] sm:text-xs uppercase tracking-[0.2em] text-gold-300 font-extrabold mb-2.5 drop-shadow-sm">
                MONTH
              </span>
              <div className="p-1.5 bg-white/5 rounded-2xl border border-gold-500/15 shadow-xl inline-block">
                <ScratchReveal
                  width={90}
                  height={90}
                  onReveal={() => setIsMonthRevealed(true)}
                  content={
                    <div className={`w-[76px] h-[76px] rounded-full flex items-center justify-center p-1 overflow-hidden transition-all duration-500 ${
                      isMonthRevealed 
                        ? "bg-rose-50 border border-pink-200/50 shadow-inner" 
                        : "bg-transparent border-transparent"
                    }`}>
                      <span className="font-sans text-xs sm:text-sm font-black text-pink-600 uppercase tracking-widest leading-none drop-shadow-sm truncate max-w-[58px]">
                        {monthOfMarry}
                      </span>
                    </div>
                  }
                />
              </div>
            </div>

            {/* Heart 3: Year */}
            <div className="flex flex-col items-center shrink-0">
              <span className="font-sans text-[11px] sm:text-xs uppercase tracking-[0.2em] text-gold-300 font-extrabold mb-2.5 drop-shadow-sm">
                YEAR
              </span>
              <div className="p-1.5 bg-white/5 rounded-2xl border border-gold-500/15 shadow-xl inline-block">
                <ScratchReveal
                  width={90}
                  height={90}
                  onReveal={() => setIsYearRevealed(true)}
                  content={
                    <div className={`w-[76px] h-[76px] rounded-full flex items-center justify-center p-1 overflow-hidden transition-all duration-500 ${
                      isYearRevealed 
                        ? "bg-rose-50 border border-pink-200/50 shadow-inner" 
                        : "bg-transparent border-transparent"
                    }`}>
                      <span className="font-sans text-xs sm:text-sm font-black text-pink-600 tracking-wide leading-none drop-shadow-sm">
                        {yearOfMarry}
                      </span>
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        </motion.section>

        {allHeartsScratched && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <SectionSeparator />

            {/* 4. INVITATION MESSAGE SECTION */}
        <motion.section 
          id="message" 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="py-16 px-4 md:px-8 max-w-4xl mx-auto text-center relative z-10"
        >
          <div className="flex justify-center mb-6">
            <Heart size={28} className="text-gold-700 fill-gold-700/20 animate-pulse" />
          </div>
          
          <h2 className="font-display text-3xl md:text-4xl text-red-700 tracking-wide mb-2 uppercase font-bold">
            {config.welcomeMessage.title}
          </h2>
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold-800/80 mb-6 font-semibold">
            {config.welcomeMessage.subtitle}
          </p>
          
          <div className="w-16 h-[1px] bg-gold-600/40 mx-auto mb-8" />
          
          <p className="font-sans text-sm md:text-base leading-relaxed text-gray-900 max-w-2xl mx-auto font-medium">
            {config.welcomeMessage.text}
          </p>

          <p className="font-accent text-4xl text-red-700 mt-10">
            Save the Date to celebrate our happiness!
          </p>
        </motion.section>

        <SectionSeparator />

        {/* 10. PHOTO GALLERY SECTION (STICKY STACKING) */}
        {config.galleryImages.length > 0 && (
          <section id="gallery" className="relative w-full max-w-4xl mx-auto px-4 my-16 z-10">
            <div className="text-center mb-12 sticky top-4 z-20 bg-[#FFF8F3]/90 backdrop-blur-md py-4 rounded-3xl border border-gold-300/30 shadow-sm">
              <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-gold-700 font-bold">
                Moments of Love
              </span>
              <h2 className="font-display text-3xl md:text-4xl text-red-700 tracking-wide mt-1 uppercase font-bold">
                Togetherness 😍
              </h2>
              <div className="w-12 h-0.5 bg-gold-600/40 mx-auto mt-3" />
            </div>

            <div className="relative w-full pb-[10vh]">
              {config.galleryImages.map((img, index) => {
                // Alternating tilt for polaroid effect
                const tilt = index % 2 === 0 ? "rotate-[-2deg]" : "rotate-[2deg]";
                return (
                  <div 
                    key={index}
                    className="sticky flex items-center justify-center w-full min-h-[50vh] md:min-h-[60vh] mb-12"
                    style={{ top: `${100 + index * 25}px`, zIndex: index + 10 }}
                  >
                    <div className={`relative w-full max-w-md bg-white p-3 md:p-5 pb-8 md:pb-12 rounded-lg shadow-2xl border border-gray-200 transition-transform duration-500 hover:scale-105 ${tilt}`}>
                      <div className="relative w-full aspect-[2/3] rounded-sm overflow-hidden bg-gray-100 mb-4 shadow-inner">
                        <FirestoreImage src={img.url} alt={img.caption} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-center px-2">
                        <span className="font-display text-gray-800 text-lg md:text-xl tracking-wide font-medium">
                          {img.caption}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <SectionSeparator />

        {/* 5 & 6. GROOM & BRIDE SECTIONS */}
        <motion.section 
          id="couple" 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="py-16 px-4 md:px-8 max-w-5xl mx-auto relative z-10"
        >
          <div className="text-center mb-12">
            <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-gold-700 font-bold">
              Introducing
            </span>
            <h2 className="font-display text-3xl md:text-4xl text-red-700 tracking-wide mt-1 uppercase font-bold">
              The Bride & The Groom
            </h2>
            <div className="w-12 h-0.5 bg-gold-600/40 mx-auto mt-3" />
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            
            {/* Elegant '&' divider */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-gold-50 border-[3px] md:border-4 border-gold-300 shadow-xl">
              <span className="font-accent text-4xl md:text-5xl text-red-700 mt-1 md:mt-2">&amp;</span>
            </div>

            {/* Groom Section */}
            <OrnateFrame borderColor="border-gold-600/40 bg-white/60">
              <div className="flex flex-col items-center text-center p-2">
                <span className="font-accent text-4xl text-red-700 mb-2">
                  The Groom
                </span>
                
                {/* Groom Photo with Royal Frame */}
                <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-gold-400 shadow-xl mb-6 group">
                  <FirestoreImage
                    src={config.groom.imageUrl}
                    alt={config.groom.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                    <span className="text-[10px] text-white uppercase tracking-widest font-semibold">
                      Shri Aarav
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <h3 className="font-display text-3xl text-red-700 tracking-wider font-bold">
                    {config.groom.name}
                  </h3>
                  <TurbanIcon className="w-8 h-8 text-gold-600" />
                </div>
                
                {/* Parents details */}
                <div className="my-3 text-gold-800/80 font-sans text-xs uppercase tracking-widest leading-relaxed">
                  <p className="font-semibold">Beloved Son of</p>
                  <p className="font-bold text-gold-900 text-sm mt-0.5">
                    {config.groom.motherName}
                  </p>
                  <p className="font-semibold">&amp;</p>
                  <p className="font-bold text-gold-900 text-sm">
                    {config.groom.fatherName}
                  </p>
                </div>

                <p className="font-sans text-xs md:text-sm text-gray-800 leading-relaxed font-medium mt-4 px-4 border-t border-gold-600/20 pt-4">
                  {config.groom.bio}
                </p>
              </div>
            </OrnateFrame>

            {/* Bride Section */}
            <OrnateFrame borderColor="border-gold-600/40 bg-white/60">
              <div className="flex flex-col items-center text-center p-2">
                <span className="font-accent text-4xl text-red-700 mb-2">
                  The Bride
                </span>
                
                {/* Bride Photo with Royal Frame */}
                <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-gold-400 shadow-xl mb-6 group">
                  <FirestoreImage
                    src={config.bride.imageUrl}
                    alt={config.bride.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                    <span className="text-[10px] text-white uppercase tracking-widest font-semibold">
                      Smt. Ananya
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <h3 className="font-display text-3xl text-red-700 tracking-wider font-bold">
                    {config.bride.name}
                  </h3>
                  <BindiIcon className="w-6 h-6 text-red-600" />
                </div>
                
                {/* Parents details */}
                <div className="my-3 text-gold-800/80 font-sans text-xs uppercase tracking-widest leading-relaxed">
                  <p className="font-semibold">Beloved Daughter of</p>
                  <p className="font-bold text-gold-900 text-sm mt-0.5">
                    {config.bride.motherName}
                  </p>
                  <p className="font-semibold">&amp;</p>
                  <p className="font-bold text-gold-900 text-sm">
                    {config.bride.fatherName}
                  </p>
                </div>

                <p className="font-sans text-xs md:text-sm text-gray-800 leading-relaxed font-medium mt-4 px-4 border-t border-gold-600/20 pt-4">
                  {config.bride.bio}
                </p>
              </div>
            </OrnateFrame>
          </div>
        </motion.section>

        <SectionSeparator />

        {/* 7. ENGAGEMENT TEASER VIDEO SECTION */}
        {config.youtubeEmbedUrl && (
          <motion.section 
            id="video" 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="py-16 bg-white/60 border-y border-gold-500/20 relative z-10 shadow-sm"
          >
            <div className="max-w-4xl mx-auto px-4 text-center">
              <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-gold-700 font-bold">
                Watch Our Teaser
              </span>
              <h2 className="font-display text-2xl md:text-3xl text-red-700 tracking-wide mt-1 mb-8 uppercase font-bold">
                Love in Motion
              </h2>

              {/* Video container */}
              <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-gold-400/30 shadow-2xl bg-black">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={config.youtubeEmbedUrl}
                  title="Engagement Cinematic Teaser"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </motion.section>
        )}

        {config.youtubeEmbedUrl && <SectionSeparator />}
        {!config.youtubeEmbedUrl && <SectionSeparator />}



        {/* ENGAGEMENT DETAILS SECTION */}
        <motion.section 
          id="engagement-details" 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="py-16 px-4 md:px-8 max-w-5xl mx-auto relative z-10"
        >
          <div className="text-center mb-12">
            <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-gold-700 font-bold">
              Join The Celebration
            </span>
            <h2 className="font-display text-3xl md:text-4xl text-red-700 tracking-wide mt-1 uppercase font-bold">
              Engagement Details
            </h2>
            <div className="w-12 h-0.5 bg-gold-600/40 mx-auto mt-3" />
          </div>

          <div className="border border-gold-500/20 bg-gradient-to-br from-white via-royal-red-50 to-white rounded-3xl overflow-hidden shadow-xl flex flex-col md:flex-row">
            <div className="md:w-1/2 p-8 flex flex-col justify-center space-y-6">
              <div>
                <h3 className="font-display text-2xl md:text-3xl text-red-700 font-bold mb-4">
                  The Ceremony
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-gray-900 text-sm">
                    <Calendar size={18} className="text-gold-700 shrink-0" />
                    <span className="font-sans font-semibold">{config.displayDate}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-gray-900 text-sm">
                    <Clock size={18} className="text-gold-700 shrink-0" />
                    <span className="font-sans font-medium">{config.engagementDetails.time}</span>
                  </div>
                  <div className="flex items-start space-x-3 text-gray-800 text-sm">
                    <MapPin size={18} className="text-gold-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gold-900">{config.engagementDetails.venueName}</p>
                      <p className="text-xs text-gray-700 mt-1 leading-relaxed font-medium">{config.engagementDetails.venueAddress}</p>
                    </div>
                  </div>
                </div>
              </div>

              <a
                href={config.engagementDetails.mapDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-royal-red-950 font-bold uppercase text-xs tracking-wider py-3 px-6 rounded-xl text-center shadow-lg hover:shadow-[0_0_15px_rgba(222,196,127,0.4)] transition-all duration-300 flex items-center justify-center space-x-2 mt-4"
              >
                <MapPin size={15} />
                <span>Get Directions</span>
                <ExternalLink size={13} />
              </a>
            </div>

            <div className="md:w-1/2 min-h-[300px] bg-gray-100 relative">
               <iframe
                src={config.engagementDetails.mapEmbedUrl || undefined}
                width="100%"
                height="100%"
                style={{ border: 0, position: 'absolute', top: 0, left: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer"
                title={`Engagement Map`}
              />
            </div>
          </div>
        </motion.section>



        {/* 11. RSVP FORM SECTION */}
        <motion.section 
          id="rsvp" 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="py-16 px-4 max-w-lg mx-auto relative z-10"
        >
          <OrnateFrame borderColor="border-gold-600/40 bg-white/60">
            <form onSubmit={handleRSVPSubmit} className="space-y-6 p-2 text-center">
              <div>
                <Heart size={24} className="text-gold-600 fill-gold-600 mx-auto animate-pulse mb-3" />
                <h2 className="font-display text-2xl md:text-3xl text-red-700 uppercase font-bold">
                  Kindly RSVP
                </h2>
                <p className="font-sans text-[10px] text-gray-600 uppercase tracking-[0.2em] mt-1 font-semibold">
                  Please respond by December 1, 2026
                </p>
                <div className="w-12 h-[1px] bg-gold-600/40 mx-auto mt-4" />
              </div>

              {/* RSVP Fields */}
              <div className="space-y-4 text-left">
                
                {/* Full Name */}
                <div>
                  <label className="text-xs uppercase tracking-widest text-gray-900 block mb-1.5 font-semibold">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Harish Sharma"
                      value={rsvpName}
                      onChange={(e) => setRsvpName(e.target.value)}
                      className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gold-500/30 focus:border-gold-600 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-600 transition-colors font-medium shadow-sm"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="text-xs uppercase tracking-widest text-gray-900 block mb-1.5 font-semibold">
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <Phone size={16} />
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="e.g., +91 98765 43210"
                      value={rsvpPhone}
                      onChange={(e) => setRsvpPhone(e.target.value)}
                      className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gold-500/30 focus:border-gold-600 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-600 transition-colors font-medium shadow-sm"
                    />
                  </div>
                </div>

                {/* Will you attend? */}
                <div>
                  <label className="text-xs uppercase tracking-widest text-gray-900 block mb-2 font-semibold">
                    Will You Attend?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRsvpAttend(true);
                        confetti({
                          particleCount: 100,
                          spread: 70,
                          origin: { y: 0.8 },
                          colors: ['#dec47f', '#962325', '#f8d98d']
                        });
                      }}
                      className={`py-3 px-4 rounded-xl font-bold uppercase text-xs tracking-wider border transition-all cursor-pointer ${
                        rsvpAttend === true
                          ? "bg-gold-gradient text-white border-gold-600 shadow-md"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gold-600/40"
                      }`}
                    >
                      Yes, Joyfully!
                    </button>
                    <button
                      type="button"
                      onClick={() => setRsvpAttend(false)}
                      className={`py-3 px-4 rounded-xl font-bold uppercase text-xs tracking-wider border transition-all cursor-pointer ${
                        rsvpAttend === false
                          ? "bg-gold-gradient text-white border-gold-600 shadow-md"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gold-600/40"
                      }`}
                    >
                      Regretfully, No
                    </button>
                  </div>
                </div>

                {/* Guest Selector (Conditional) */}
                <AnimatePresence>
                  {rsvpAttend === true && (
                    <motion.div
                      key="guest-selector"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <label className="text-xs uppercase tracking-widest text-gray-900 block mb-1.5 font-semibold mt-4">
                        Number of Guests
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                          <Users size={16} />
                        </span>
                        <select
                          value={rsvpGuests}
                          onChange={(e) => setRsvpGuests(Number(e.target.value))}
                          className="w-full bg-white text-gray-900 border border-gold-500/30 focus:border-gold-600 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-600 transition-colors font-medium appearance-none shadow-sm"
                        >
                          <option value="1">1 Guest</option>
                          <option value="2">2 Guests</option>
                          <option value="3">3 Guests</option>
                          <option value="4">4 Guests</option>
                          <option value="5">5+ Guests</option>
                        </select>
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          ▼
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Warm wishes / Messages */}
                <div>
                  <label className="text-xs uppercase tracking-widest text-gray-900 block mb-1.5 font-semibold mt-4">
                    Blessing Message
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-gray-400">
                      <MessageSquare size={16} />
                    </span>
                    <textarea
                      rows={3}
                      placeholder="Send your blessings, warm wishes, or dietary notes..."
                      value={rsvpMessage}
                      onChange={(e) => setRsvpMessage(e.target.value)}
                      className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gold-500/30 focus:border-gold-600 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-600 transition-colors font-medium resize-none shadow-sm"
                    />
                  </div>
                </div>

              </div>

              {/* Submit trigger */}
              <button
                type="submit"
                className="w-full bg-gold-gradient text-white font-bold uppercase text-xs tracking-wider py-4 px-6 rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(222,196,127,0.6)] transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer mt-2"
              >
                <Send size={15} />
                <span>Submit RSVP</span>
              </button>


            </form>
          </OrnateFrame>
        </motion.section>

        <SectionSeparator />

        {/* 12. THANK YOU SECTION */}
        <motion.section 
          id="thankyou" 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="py-16 px-4 md:px-8 text-center relative z-10"
        >
          <div className="max-w-2xl mx-auto flex flex-col items-center">
            {config.envelopeIconUrl ? (
              <FirestoreImage src={config.envelopeIconUrl} alt="Icon" className="w-[60px] h-[60px] object-contain opacity-80 mb-4" />
            ) : config.heroSettings?.ganeshaIconUrl ? (
              <FirestoreImage src={config.heroSettings.ganeshaIconUrl} alt="Ganesha Icon" className="w-[60px] h-[60px] object-contain opacity-80 mb-4" />
            ) : (
              <GaneshaIcon size={60} className="text-amber-600 opacity-90 mb-4" />
            )}
            
            <p className="font-accent text-5xl md:text-6xl text-red-700 mb-2">
              Dhanyawaad
            </p>
            <p className="font-sans text-xs uppercase tracking-[0.25em] text-gold-700 mb-6 font-bold">
              Thank You
            </p>

            {/* Final Couple Portrait Frame */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-2 border-gold-600 p-1 mb-8 shadow-xl overflow-hidden">
              <FirestoreImage
                src={config.thankYouImageUrl || config.galleryImages[config.galleryImages.length - 1]?.url || config.galleryImages[0]?.url}
                alt="Thank You Portrait"
                className="w-full h-full object-cover rounded-full"
              />
            </div>

            <p className="font-sans text-sm md:text-base leading-relaxed text-gray-800 mb-6 font-medium max-w-lg">
              {config.familyDetails.message}
            </p>

            <span className="font-sans text-[11px] uppercase tracking-widest text-gray-600 font-bold">
              {config.familyDetails.welcomingText}
            </span>
            <div className="space-y-1.5 mt-3 mb-10 font-display text-lg text-red-700 tracking-wider font-bold">
              {config.familyDetails.names.map((name, i) => (
                <p key={i}>{name}</p>
              ))}
            </div>

            {/* Social icons */}
            <div className="flex items-center justify-center space-x-6">
              <a
                href={config.socialLinks.instagram}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full border border-gold-600/40 flex items-center justify-center text-gold-900 hover:text-gold-900 hover:border-gold-600 transition-colors shadow-md hover:shadow-lg cursor-pointer bg-white"
                title="Instagram Link"
              >
                <Instagram size={18} />
              </a>
              <a
                href={config.socialLinks.facebook}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full border border-gold-600/40 flex items-center justify-center text-gold-900 hover:text-gold-900 hover:border-gold-600 transition-colors shadow-md hover:shadow-lg cursor-pointer bg-white"
                title="Facebook Link"
              >
                <Facebook size={18} />
              </a>
            </div>
          </div>
        </motion.section>

        {/* FOOTER */}
        <footer className="py-10 bg-white text-center relative z-10 flex flex-col justify-center items-center overflow-hidden">
          <div className="absolute inset-0 bg-pink-50/50 pointer-events-none" />
          <div className="relative border border-pink-300 px-6 md:px-10 py-3 bg-white/90 shadow-sm mb-6 rounded-sm">
            <span className="font-sans text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] text-pink-800/80 font-bold whitespace-nowrap">
              Create with <span className="text-red-500 animate-pulse inline-block mx-1">❤️</span> by digiinvitations_
            </span>
          </div>
          
          {isOpened && (
            <button
              onClick={() => setShowAdmin(true)}
              className="relative z-10 text-pink-400/40 hover:text-pink-600 transition-all duration-300 opacity-60 hover:opacity-100 flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold"
              title="Open Host Admin Panel"
            >
              <Settings size={12} className="animate-[spin_10s_linear_infinite]" />
              <span>Admin</span>
            </button>
          )}
        </footer>
          </motion.div>
        )}

      </div>

      {/* 13. FLOATING BUTTONS */}
      {/* Music Floating Toggle (Bottom Left) */}
      {isOpened && (
        <div className="fixed bottom-6 left-6 z-40 flex items-center gap-3 group">
          <div className="relative">
            {/* Flower decorations */}
            <div className="absolute -top-3 -left-3 text-pink-400 rotate-12 opacity-80 pointer-events-none transition-transform group-hover:scale-110">
              <Flower2 size={20} />
            </div>
            <div className="absolute -bottom-2 -right-2 text-pink-500 -rotate-12 opacity-80 pointer-events-none transition-transform group-hover:scale-110">
              <Flower2 size={16} />
            </div>
            <button
              onClick={toggleMusic}
              className={`relative w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-xl cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 border border-pink-300 ${
                musicPlaying ? "bg-gradient-to-br from-pink-400 to-pink-600 text-white animate-[spin_8s_linear_infinite]" : "bg-white text-pink-600"
              }`}
              title={musicPlaying ? "Mute Background Music" : "Play Background Music"}
            >
              {musicPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
          
          {/* Animated Music Wave Bars (Saves user having to guess if it's active) */}
          {musicPlaying && (
            <div className="flex items-end gap-0.5 h-6 bg-white/90 p-1.5 rounded-md border border-pink-300/30 pointer-events-none shadow-sm">
              <span className="w-0.5 h-full bg-pink-500 rounded-sm animate-[pulse_1s_infinite_100ms]" style={{ minHeight: "6px" }} />
              <span className="w-0.5 h-full bg-pink-500 rounded-sm animate-[pulse_1s_infinite_300ms]" style={{ minHeight: "12px" }} />
              <span className="w-0.5 h-full bg-pink-500 rounded-sm animate-[pulse_1s_infinite_500ms]" style={{ minHeight: "8px" }} />
            </div>
          )}
        </div>
      )}

      {/* Scroll-to-Top Toggle (Bottom Right) */}
      <AnimatePresence>
        {isOpened && showScrollTop && (
          <motion.div
            key="scroll-top"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-6 right-6 z-40 group"
          >
            <div className="relative">
              <div className="absolute -top-3 -right-3 text-pink-400 rotate-[30deg] opacity-80 pointer-events-none transition-transform group-hover:scale-110">
                <Flower2 size={20} />
              </div>
              <div className="absolute -bottom-2 -left-2 text-pink-500 -rotate-[20deg] opacity-80 pointer-events-none transition-transform group-hover:scale-110">
                <Flower2 size={16} />
              </div>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 text-white font-bold flex items-center justify-center shadow-xl border border-pink-300 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                title="Scroll To Top"
              >
                <ChevronUp size={20} className="stroke-[3]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* RSVP Confirmation Modal */}
      <RSVPModal
        isOpen={showRsvpModal}
        onClose={handleModalClose}
        guestName={rsvpName}
        isAttending={rsvpAttend === true}
        guestsCount={rsvpGuests}
        weddingDate={config.weddingDate}
      />

      {/* Admin Dashboard Drawer/Modal */}
      <AdminPanel
        isOpen={showAdmin}
        onClose={() => setShowAdmin(false)}
        config={config}
        onConfigChange={handleConfigChange}
      />

    </div>
  );
}
