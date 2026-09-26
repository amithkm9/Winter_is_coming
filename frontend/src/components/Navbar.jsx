import React from 'react';
import { Volume2, VolumeX, BookOpen, RotateCcw, ShieldCheck, Video, Flame } from 'lucide-react';
import { sound } from '../services/sound';

export default function Navbar({
  liberatedCount,
  totalCount = 16,
  score,
  soundEnabled,
  setSoundEnabled,
  onOpenCodex,
  onOpenPractice,
  onResetGame
}) {
  const handleToggleSound = () => {
    const newState = sound.toggle();
    setSoundEnabled(newState);
    sound.playClick();
  };

  const progressPercent = Math.round((liberatedCount / totalCount) * 100);
  // Calculate average Paris temperature based on liberated districts
  const currentTemp = Math.round(-30 + (progressPercent / 100) * 48);

  return (
    <header className="sticky top-0 z-40 bg-[#020614]/90 backdrop-blur-xl border-b border-cyan-500/30 px-4 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Title & Lore Tag */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-cyan-950/90 border border-cyan-400/60 text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.4)]">
            <span className="text-2xl animate-pulse">❄️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 text-lg sm:text-2xl text-glow-cyan">
                WINTER IS COMING
              </h1>
              <span className="hidden sm:inline-block text-[10px] uppercase font-mono font-black px-2.5 py-0.5 rounded-full bg-red-950 border border-red-500 text-red-300 shadow-[0_0_10px_#ff0055] animate-pulse">
                AI LOCKOUT
              </span>
            </div>
            <p className="text-xs text-cyan-400/80 font-mono tracking-wider">
              PARIS RESISTANCE NETWORK // <span className="text-white font-bold">COMPUTER VISION CIPHERS</span>
            </p>
          </div>
        </div>

        {/* Global Stats: Liberation & Temperature */}
        <div className="flex items-center gap-4 bg-slate-950/90 border border-slate-800/90 rounded-2xl px-5 py-2.5 shadow-lg">
          
          {/* Liberation Progress */}
          <div className="flex flex-col min-w-[130px] sm:min-w-[160px]">
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-400 font-bold">LIBERATION</span>
              <span className="text-cyan-300 font-black">{liberatedCount} / {totalCount} ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-cyan-500/30">
              <div
                className="bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 h-full transition-all duration-500 shadow-[0_0_12px_rgba(0,240,255,0.6)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Temperature Status */}
          <div className="hidden md:flex items-center gap-2.5 border-l border-slate-800 pl-4">
            <Flame className={`w-5 h-5 ${currentTemp > 0 ? 'text-amber-400 animate-bounce' : 'text-cyan-400 animate-pulse'}`} />
            <div className="text-xs font-mono">
              <div className="text-slate-400 text-[10px] font-bold">PARIS CLIMATE</div>
              <div className={`font-black ${currentTemp > 0 ? 'text-amber-300 text-glow-gold' : 'text-cyan-300 text-glow-cyan'}`}>
                {currentTemp > 0 ? `+${currentTemp}°C (Thawing)` : `${currentTemp}°C (Cryo Freeze)`}
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="hidden lg:flex flex-col border-l border-slate-800 pl-4">
            <span className="text-slate-400 text-[10px] font-mono font-bold">RESISTANCE PTS</span>
            <span className="font-mono font-black text-amber-400 text-base text-glow-gold">{score.toLocaleString()} PTS</span>
          </div>

        </div>

        {/* Navigation / Action Buttons */}
        <div className="flex items-center gap-2.5">
          
          {/* Sign Language Codex */}
          <button
            onClick={() => { sound.playClick(); onOpenCodex(); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/50 hover:border-cyan-300 text-cyan-200 text-xs font-mono font-bold transition-all transform hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,240,255,0.25)]"
            title="Open Sign Language Codex"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">SIGN CODEX</span>
          </button>

          {/* Practice Camera HUD */}
          <button
            onClick={() => { sound.playClick(); onOpenPractice(); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 hover:border-emerald-400 text-emerald-200 text-xs font-mono font-bold transition-all transform hover:-translate-y-0.5 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
            title="Open Live Vision Scanner Practice"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">SCANNER TEST</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2.5 rounded-xl border transition-all text-xs font-mono ${
              soundEnabled
                ? 'bg-slate-900 border-cyan-500/40 text-cyan-300 hover:bg-slate-800 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'Mute Cyberpunk Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Reset Game Button */}
          <button
            onClick={() => {
              if (window.confirm('Reset all liberated sectors and restart the resistance campaign?')) {
                sound.playFail();
                onResetGame();
              }
            }}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-red-950/80 border border-slate-800 hover:border-red-500 text-slate-400 hover:text-red-400 transition-all text-xs"
            title="Reset Game Campaign"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
}
