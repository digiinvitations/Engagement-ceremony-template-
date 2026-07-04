import React from "react";

interface GaneshaIconProps {
  className?: string;
  size?: number;
}

export const GaneshaIcon: React.FC<GaneshaIconProps> = ({ className = "", size = 120 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-all duration-300`}
    >
      {/* Halo / Aura Mandala Background */}
      <circle
        cx="50"
        cy="55"
        r="42"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 2"
        className="opacity-40 animate-[spin_60s_linear_infinite]"
      />
      <circle
        cx="50"
        cy="55"
        r="38"
        stroke="currentColor"
        strokeWidth="0.75"
        className="opacity-30"
      />

      {/* Stylized Lotus Base */}
      <path
        d="M 25,102 C 35,112 65,112 75,102 C 68,105 50,107 50,105 C 50,107 32,105 25,102 Z"
        fill="currentColor"
        className="opacity-70"
      />
      <path
        d="M 30,97 C 40,105 60,105 70,97 C 62,100 50,102 50,100 C 50,102 38,100 30,97 Z"
        fill="currentColor"
      />

      {/* Ganesha Crown (Mukut) */}
      <path
        d="M 42,30 L 50,10 L 58,30 L 54,26 L 50,33 L 46,26 L 42,30 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
      />
      <circle cx="50" cy="8" r="1.5" fill="#f43f5e" /> {/* Red ruby on top */}
      <path
        d="M 45,33 H 55 L 53,37 H 47 L 45,33 Z"
        fill="currentColor"
      />

      {/* Ears */}
      {/* Left Ear */}
      <path
        d="M 42,42 C 30,42 22,48 24,60 C 26,70 36,70 40,65"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Right Ear */}
      <path
        d="M 58,42 C 70,42 78,48 76,60 C 74,70 64,70 60,65"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Head & Face */}
      <path
        d="M 42,37 C 45,39 55,39 58,37 C 58,48 42,48 42,37 Z"
        fill="currentColor"
        className="opacity-80"
      />

      {/* Trunk (Sondh) - Curving elegantly to the left (traditional for auspiciousness) */}
      <path
        d="M 50,45 C 51,55 53,60 55,65 C 57,72 58,80 54,84 C 49,88 40,86 42,78 C 43,74 48,76 47,80 C 46,82 48,81 50,80 C 51,79 51,75 50,70 C 48,64 47,58 48,45"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Tusk (Ekdant) */}
      <path
        d="M 45,55 L 39,56 L 45,58 Z"
        fill="currentColor"
      />

      {/* Modak (Sweet) on the Trunk Tip / Hand representation */}
      <circle cx="41" cy="79" r="2.5" fill="currentColor" />
      <circle cx="41" cy="79" r="1.5" fill="#f59e0b" />

      {/* Eyes and Tilak */}
      {/* Left Eye */}
      <path
        d="M 43,51 C 45,52 46,51 47,50"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Right Eye */}
      <path
        d="M 57,51 C 55,52 54,51 53,50"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Red Tilak (Auspicious forehead mark) */}
      <path
        d="M 49,34 C 49,34 50,42 50,42 C 50,42 51,34 51,34 Z"
        fill="#be123c"
      />
      <line
        x1="46"
        y1="38"
        x2="54"
        y2="38"
        stroke="#f59e0b"
        strokeWidth="1"
      />

      {/* Gradients */}
      <defs>
        <linearGradient id="goldGradientGanesha" x1="0" y1="0" x2="100" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f5edd6" />
          <stop offset="30%" stopColor="#dec47f" />
          <stop offset="70%" stopColor="#c28f36" />
          <stop offset="100%" stopColor="#84571f" />
        </linearGradient>
      </defs>
    </svg>
  );
};
