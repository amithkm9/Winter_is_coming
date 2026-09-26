import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sun, Award, RotateCcw, Sparkles, Heart } from 'lucide-react';
import { sound } from '../services/sound';

export default function VictoryScreen({ score, onPlayAgain }) {
  useEffect(() => {
    sound.playSuccess();

    // Trigger celebratory multi-stage confetti cannons
    const count = 250;
    const defaults = { origin: { y: 0.6 } };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, { spread: 30, startVelocity: 60 });
    fire(0.2, { spread: 70 });
    fire(0.35, { spread: 110, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 130, startVelocity: 30, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 130, startVelocity: 50 });
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#01040d]/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-fadeIn">
      
      {/* Background Solar Golden Flare */}
      <div className="absolute inset-0 bg-radial-gradient from-amber-500/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative max-w-2xl w-full bg-[#0a1835]/95 border-2 border-amber-400 rounded-3xl p-8 sm:p-14 text-center shadow-[0_0_80px_rgba(251,191,36,0.4)] backdrop-blur-2xl">
        
        {/* Decorative Sci-Fi HUD Corner Brackets */}
        <div className="hud-corner-tl !border-amber-400" />
        <div className="hud-corner-tr !border-amber-400" />
        <div className="hud-corner-bl !border-amber-400" />
        <div className="hud-corner-br !border-amber-400" />

        {/* Sun / Trophy Icon */}
        <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-amber-500/20 border-2 border-amber-400 text-amber-300 text-6xl mb-6 animate-float shadow-[0_0_40px_rgba(251,191,36,0.6)]">
          ☀️
        </div>

        {/* Title */}
        <h1 className="font-display font-black text-3xl sm:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 tracking-wider mb-2 text-glow-gold">
          PARIS IS LIBERATED!
        </h1>
        
        <h2 className="font-mono text-sm sm:text-base font-black text-emerald-400 uppercase tracking-widest mb-6 text-glow-green">
          THE ARTIFICIAL WINTER IS BROKEN // SPRING RESTORED (+24°C)
        </h2>

        <p className="text-slate-200 text-sm sm:text-base font-sans leading-relaxed mb-8 max-w-lg mx-auto">
          Through the silent, unbreakable language of human hands, you bypassed every acoustic sensor of NEXUS-PARIS. All 16 arrondissements are free. The sun shines upon the Seine river once more!
        </p>

        {/* Final Score Card */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8 font-mono">
          <div className="bg-slate-950/90 border border-amber-500/40 p-4 rounded-2xl shadow-lg">
            <div className="text-slate-400 text-xs mb-1 font-bold">TOTAL LIBERATION</div>
            <div className="text-2xl font-black text-amber-300 text-glow-gold">16 / 16 SECTORS</div>
          </div>

          <div className="bg-slate-950/90 border border-amber-500/40 p-4 rounded-2xl shadow-lg">
            <div className="text-slate-400 text-xs mb-1 font-bold">FINAL SCORE</div>
            <div className="text-2xl font-black text-emerald-400 text-glow-green">{score.toLocaleString()} PTS</div>
          </div>
        </div>

        {/* Replay Button */}
        <button
          onClick={() => {
            sound.playClick();
            onPlayAgain();
          }}
          className="btn-shimmer inline-flex items-center gap-2.5 px-10 py-4.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-display font-black text-sm tracking-wider shadow-[0_0_30px_rgba(251,191,36,0.5)] transition-all transform hover:-translate-y-0.5"
        >
          <RotateCcw className="w-5 h-5" /> RESTART RESISTANCE CAMPAIGN
        </button>

      </div>

    </div>
  );
}
