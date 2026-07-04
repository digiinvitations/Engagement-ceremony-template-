import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FirestoreImage } from "./FirestoreImage";
import { fetchFromFsdb } from "../lib/fsdb";

interface EnvelopeCoverProps {
  isOpen: boolean;
  onOpen: () => void;
  onSealTap?: () => void;
  openingBackgroundImageUrl: string;
  openingSealImageUrl: string;
  openingVideoUrl: string;
}

export const EnvelopeCover: React.FC<EnvelopeCoverProps> = ({
  onOpen,
  onSealTap,
  openingBackgroundImageUrl,
  openingSealImageUrl,
  openingVideoUrl
}) => {
  const [isOpening, setIsOpening] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>("");

  useEffect(() => {
    if (openingVideoUrl) {
      if (openingVideoUrl.startsWith("fsdb://")) {
        fetchFromFsdb(openingVideoUrl).then(url => {
          if (url) setResolvedVideoUrl(url);
        });
      } else {
        setResolvedVideoUrl(openingVideoUrl);
      }
    } else {
      setResolvedVideoUrl("");
    }
  }, [openingVideoUrl]);

  const handleOpen = () => {
    if (isOpening) return;
    setIsOpening(true);
    
    if (onSealTap) {
      onSealTap();
    }
    
    if (resolvedVideoUrl && videoRef.current) {
      // Play immediately to ensure user interaction token is used
      setVideoPlaying(true);
      videoRef.current.play().catch(e => {
        console.error("Video play failed:", e);
      });
    } else {
      setTimeout(() => {
        onOpen();
      }, 500);
    }
  };

  const handleVideoEnded = () => {
    onOpen();
  };

  return (
    <motion.div
      exit={{ opacity: 0, transition: { duration: 1 } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-black"
    >
      <AnimatePresence>
        {!videoPlaying && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-10"
          >
            {openingBackgroundImageUrl && (
              <FirestoreImage 
                src={openingBackgroundImageUrl} 
                alt="Background" 
                className="w-full h-full object-cover object-center" 
              />
            )}
            <div className="absolute inset-0 bg-black/30 pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>

      {resolvedVideoUrl && (
        <motion.div 
          animate={{ opacity: videoPlaying ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-10"
          style={{ pointerEvents: videoPlaying ? 'auto' : 'none' }}
        >
          <video 
            ref={videoRef}
            src={resolvedVideoUrl || undefined}
            className="w-full h-full object-cover object-center"
            onEnded={handleVideoEnded}
            onError={() => {
              if (isOpening) onOpen();
            }}
            playsInline
          />
        </motion.div>
      )}

      <AnimatePresence>
        {!isOpening && (
          <motion.div
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 1 } }}
            className="absolute z-20 flex flex-col items-center justify-center cursor-pointer select-none mt-48 ml-4"
            onClick={handleOpen}
          >
            {/* Pulsing Outer Glow */}
            <div className="absolute w-36 h-36 rounded-full bg-white/20 animate-ping duration-[3000ms] pointer-events-none" />
            
            <motion.div 
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-32 h-32 flex items-center justify-center relative"
            >
              {openingSealImageUrl && (
                <FirestoreImage 
                  src={openingSealImageUrl} 
                  alt="Opening Seal" 
                  className="w-full h-full object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]" 
                />
              )}
            </motion.div>
            
            {/* Tap Helper Text */}
            <motion.span
              className="font-sans text-[10px] uppercase text-white tracking-[0.3em] mt-8 font-bold bg-black/50 backdrop-blur-sm px-6 py-2 rounded-full border border-white/20 shadow-sm"
            >
              TAP TO OPEN
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

