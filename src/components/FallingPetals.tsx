import React, { useEffect, useState } from 'react';

interface Petal {
  id: number;
  left: number; // percentage
  animationDuration: number; // seconds
  animationDelay: number; // seconds
  size: number; // px
  rotation: number; // initial rotation
  colorClass: string;
  driftClass: string;
}

export function FallingPetals({ active, count = 25, className = "z-0" }: { active: boolean, count?: number, className?: string }) {
  const [petals, setPetals] = useState<Petal[]>([]);

  useEffect(() => {
    if (!active) {
      setPetals([]);
      return;
    }

    const colors = [
      'text-pink-200', // soft pink
      'text-rose-200', // soft pink
      'text-orange-200', // peach
      'text-orange-100', // peach/cream
      'text-yellow-100', // light cream
      'text-amber-200', // golden
      'text-yellow-300' // golden
    ];

    const drifts = [
      'animate-drift-left',
      'animate-drift-right',
      'animate-drift-none'
    ];

    const initialPetals = Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 8 + Math.random() * 12, // 8-20s
      animationDelay: -Math.random() * 20, // Start some mid-air
      size: 10 + Math.random() * 20, // 10-30px
      rotation: Math.random() * 360,
      colorClass: colors[Math.floor(Math.random() * colors.length)],
      driftClass: drifts[Math.floor(Math.random() * drifts.length)],
    }));

    setPetals(initialPetals);
  }, [active, count]);

  if (!active || petals.length === 0) return null;

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      {petals.map((p) => (
        <div
          key={p.id}
          className={`absolute top-[-50px] animate-petal-fall drop-shadow-sm opacity-80 mix-blend-multiply ${p.colorClass} ${p.driftClass}`}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.animationDelay}s`,
            animationDuration: `${p.animationDuration}s`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        >
          {/* Simple petal SVG */}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,22 C12,22 17,16 17,12 C17,8 14.5,6 12,6 C9.5,6 7,8 7,12 C7,16 12,22 12,22 Z" />
          </svg>
        </div>
      ))}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes petal-fall {
          0% {
            top: -10%;
            transform: rotate(0deg) scale(1);
          }
          100% {
            top: 110%;
            transform: rotate(720deg) scale(0.8);
          }
        }
        @keyframes drift-left {
          0%, 100% { margin-left: 0px; }
          50% { margin-left: -50px; }
        }
        @keyframes drift-right {
          0%, 100% { margin-left: 0px; }
          50% { margin-left: 50px; }
        }
        .animate-petal-fall {
          animation-name: petal-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .animate-drift-left {
          animation-name: petal-fall, drift-left;
          animation-timing-function: linear, ease-in-out;
          animation-iteration-count: infinite, infinite;
          animation-direction: normal, alternate;
        }
        .animate-drift-right {
          animation-name: petal-fall, drift-right;
          animation-timing-function: linear, ease-in-out;
          animation-iteration-count: infinite, infinite;
          animation-direction: normal, alternate;
        }
        .animate-drift-none {
          animation-name: petal-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}} />
    </div>
  );
}
