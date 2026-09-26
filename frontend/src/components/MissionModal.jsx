import React from 'react';
import { X, ShieldAlert, Sparkles, Flame, Zap, Award, Target } from 'lucide-react';
import { SIGN_DICTIONARY } from '../data/signDictionary';
import { sound } from '../services/sound';

export default function MissionModal({ sector, onStartMission, onClose }) {
  if (!sector) return null;

  const isBoss = sector.id === 16;

  return (
    <div className="fixed inset-0 z-50 bg-[#02050e]/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
      <div className={`relative max-w-xl w-full bg-[#061026]/95 border-2 ${
        isBoss ? 'border-red-500 shadow-[0_0_50px_rgba(255,0,85,0.4)]' : 'border-cyan-400 shadow-[0_0_50px_rgba(0,240,255,0.3)]'
      } rounded-3xl p-6 sm:p-9 backdrop-blur-2xl`}>
        
        {/* Decorative Sci-Fi HUD Corner Brackets */}
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        {/* Close Button */}
        <button
          onClick={() => { sound.playClick(); onClose(); }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Tag */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-mono font-black px-3 py-1 rounded-lg border ${
            isBoss
              ? 'bg-red-950 border-red-500 text-red-200 shadow-[0_0_12px_#ff0055]'
              : 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
          }`}>
            SECTOR {sector.number} // {sector.temperature}
          </span>
          <span className="text-xs font-mono text-amber-400 font-bold">
            {sector.landmark}
          </span>
        </div>

        {/* Sector Title */}
        <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wider mb-2 text-glow-cyan">
          {sector.name}
        </h2>

        <p className="text-sm text-slate-200 font-sans leading-relaxed mb-6">
          {sector.description}
        </p>

        {/* AI Transmission Intercept Box */}
        <div className="bg-slate-950/95 border-l-4 border-red-500 p-4 rounded-r-2xl mb-6 shadow-inner">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-400 mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>AI OVERSEER DAEMON: {sector.aiNode}</span>
          </div>
          <p className="text-xs font-mono italic text-slate-300 leading-relaxed">
            "{sector.aiQuote}"
          </p>
        </div>

        {/* Tactical Requirements & Rewards */}
        <div className="grid grid-cols-2 gap-3 mb-6 font-mono text-xs">
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
            <div className="text-slate-400 text-[10px] mb-1 font-bold">MISSION PROTOCOL</div>
            <div className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              {sector.missionType === 'SINGLE_SIGN' && 'Single Sign Override'}
              {sector.missionType === 'SEQUENCE' && 'Sequence Cipher (Multi-sign)'}
              {sector.missionType === 'SPEED_DEFENSE' && 'Speed Decryption (Timed)'}
              {sector.missionType === 'NEXUS_BOSS' && 'Grand Nexus Core Assault'}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
            <div className="text-slate-400 text-[10px] mb-1 font-bold">REWARD UPON LIBERATION</div>
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              <span>+{sector.score} PTS // {sector.rewardWarmth}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono font-bold transition-all"
          >
            ABORT
          </button>

          <button
            onClick={() => {
              sound.playSuccess();
              onStartMission(sector);
            }}
            className={`btn-shimmer px-7 py-3 rounded-xl font-display font-black text-xs sm:text-sm tracking-wider transition-all transform hover:-translate-y-0.5 shadow-xl ${
              isBoss
                ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-red-950/60 hover:from-red-500 hover:to-rose-400'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-cyan-950/60 hover:from-cyan-400 hover:to-blue-500'
            }`}
          >
            ENGAGE MISSION 🚀
          </button>
        </div>

      </div>
    </div>
  );
}
