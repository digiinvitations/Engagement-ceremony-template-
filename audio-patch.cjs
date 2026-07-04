const fs = require("fs");
let text = fs.readFileSync("src/App.tsx", "utf8");

text = text.replace(
  `  const audioRef = useRef<HTMLAudioElement | null>(null);`,
  `  const audioRef = useRef<HTMLAudioElement | null>(null);\n  const [actualMusicUrl, setActualMusicUrl] = useState("");`
);

const oldUseEffect = text.substring(
  text.indexOf("  // Handle Audio Player\n  useEffect(() => {"),
  text.indexOf("  // Scroll to top state") - 2
);

const newUseEffect = `  // Handle Audio Player
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
        const url = await fetchFromFsdb(config.musicUrl);
        if (isCancelled || !url) return;
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
`;

text = text.replace(oldUseEffect, newUseEffect);

text = text.replace(
  `{/* 1. OVERLAY ENVELOPE COVER (Opening Screen) */}`,
  `<audio ref={audioRef} src={actualMusicUrl} loop className="hidden" />\n      \n      {/* 1. OVERLAY ENVELOPE COVER (Opening Screen) */}`
);

fs.writeFileSync("src/App.tsx", text);
