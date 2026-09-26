import React from 'react';
import { X, BookOpen, Sparkles, Check } from 'lucide-react';
import { SIGN_DICTIONARY } from '../data/signDictionary';
import { sound } from '../services/sound';

export default function SignDictionaryModal({ onTestSign, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#02050e]/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative max-w-4xl w-full max-h-[90vh] bg-[#061026]/95 border-2 border-cyan-400 rounded-3xl p-6 sm:p-9 backdrop-blur-2xl flex flex-col shadow-[0_0_60px_rgba(0,240,255,0.3)]">
        
        {/* Decorative Sci-Fi HUD Corner Brackets */}
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        {/* Close Button */}
        <button
          onClick={() => { sound.playClick(); onClose(); }}
          className="absolute top-4 right-4 p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-cyan-500/20 pb-4 mb-6">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs mb-1.5">
            <BookOpen className="w-4 h-4" />
            <span className="font-bold">TACTICAL RESISTANCE ARCHIVE // FRENCH SIGN LANGUAGE (LSF)</span>
          </div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wider text-glow-cyan">
            SIGN LANGUAGE CODEX & CIPHER MANUAL
          </h2>
          <p className="text-xs text-slate-300 font-sans mt-1">
            Master these physical signs to bypass AI acoustic surveillance and disarm cryogenic climate arrays across Paris.
          </p>
        </div>

        {/* Signs Grid */}
        <div className="overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          {Object.values(SIGN_DICTIONARY).map(sign => (
            <div
              key={sign.id}
              className="bg-slate-950/90 border border-slate-800 hover:border-cyan-400/60 rounded-2xl p-4.5 transition-all duration-300 flex flex-col justify-between hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl group-hover:scale-110 transition-transform">{sign.symbol}</span>
                    <div>
                      <h3 className="font-display font-black text-white text-base text-glow-cyan">
                        {sign.name}
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/50 text-cyan-300">
                        {sign.difficulty}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-amber-400 font-mono mb-2.5 font-bold">
                  {sign.meaning}
                </p>

                <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800/80 mb-2.5">
                  <div className="text-[10px] font-mono text-cyan-400 font-bold mb-0.5">
                    ✋ HOW TO EXECUTE:
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed font-sans">
                    {sign.instruction}
                  </div>
                </div>

                <div className="text-xs font-mono text-cyan-300/90 italic mb-3">
                  💡 {sign.mnemonic}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-900 text-xs font-mono">
                <span className="text-slate-400 truncate max-w-[200px]">
                  {sign.tacticalUse}
                </span>
                <button
                  onClick={() => {
                    sound.playClick();
                    onTestSign(sign);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-200 border border-cyan-400 hover:border-cyan-300 transition-all flex items-center gap-1.5 font-bold shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Practice Live
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Total Ciphers: {Object.keys(SIGN_DICTIONARY).length}</span>
          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-black tracking-wider transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)]"
          >
            RETURN TO MAP
          </button>
        </div>

      </div>
    </div>
  );
}
