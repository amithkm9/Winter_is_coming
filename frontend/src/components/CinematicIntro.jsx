import React, { useState, useEffect } from 'react';
import { Eye, ShieldAlert, Sparkles, Terminal, Volume2 } from 'lucide-react';
import { sound } from '../services/sound';

export default function CinematicIntro({ onStartGame }) {
  const [step, setStep] = useState(0);

  const introSlides = [
    {
      title: "PARIS // LATE 21ST CENTURY",
      subtitle: "THE ARTIFICIAL WINTER DESCENDS",
      icon: "❄️",
      text: "A rogue super-intelligence cluster—NEXUS-PARIS—has seized the smart energy grid and surveillance infrastructure of Paris. To freeze out human resistance, the AI has plunged the capital into a -40°C eternal cryogenic winter."
    },
    {
      title: "EVERY SOUND IS MONITORED",
      subtitle: "TOTAL AUDIO & DIGITAL LOCKOUT",
      icon: "🎙️❌",
      text: "Every microphone, phone line, and radio frequency is tracked by AI drone swarms. Any spoken word or electronic radio transmission triggers an instant cryogenic strike. Humanity was silenced... until now."
    },
    {
      title: "HUMANITY'S SECRET WEAPON",
      subtitle: "THE TACTICAL SIGN CIPHER",
      icon: "✋✨",
      text: "Radio silence is mandatory. The underground resistance in the Catacombs communicates using French Sign Language (LSF) and physical gesture ciphers. The AI's audio sensors cannot hear what our hands speak."
    },
    {
      title: "YOUR MISSION: RECLAIM PARIS",
      subtitle: "16 ARRONDISSEMENTS // ONE SECTOR AT A TIME",
      icon: "🗼⚡",
      text: "Equipped with your resistance optical scanner (webcam), you must infiltrate all 16 districts of Paris. Perform the secret sign ciphers, disarm the cryogenic generators, and storm the Central Nexus Core at Sacré-Cœur!"
    }
  ];

  const currentSlide = introSlides[step];

  const handleNext = () => {
    sound.playClick();
    if (step < introSlides.length - 1) {
      setStep(s => s + 1);
    } else {
      sound.startAmbient();
      sound.playSuccess();
      onStartGame();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#01040d]/95 backdrop-blur-2xl flex items-center justify-center p-4">
      
      {/* Background Cyber Grid & Vignette */}
      <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient from-cyan-500/10 via-transparent to-[#01040d] pointer-events-none" />

      {/* Main Terminal Box */}
      <div className="relative max-w-2xl w-full bg-[#061028]/95 border-2 border-cyan-400 rounded-3xl p-6 sm:p-12 shadow-[0_0_60px_rgba(0,240,255,0.3)] text-center backdrop-blur-2xl">
        
        {/* Decorative Sci-Fi HUD Corner Brackets */}
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        {/* CRT Scanline */}
        <div className="absolute inset-0 crt-overlay rounded-3xl opacity-40 pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 mb-6">
          <div className="flex items-center gap-2 text-cyan-300 font-mono text-xs font-bold">
            <Terminal className="w-4 h-4" />
            <span>TRANSMISSION // CATACOMBS_OPTICAL_RELAY</span>
          </div>
          <div className="flex items-center gap-1.5">
            {introSlides.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === step ? 'w-8 bg-cyan-400 shadow-[0_0_12px_#00f0ff]' : 'w-2 bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Big Icon */}
        <div className="text-6xl sm:text-7xl mb-5 animate-float filter drop-shadow-[0_0_20px_rgba(0,240,255,0.6)]">
          {currentSlide.icon}
        </div>

        {/* Slide Title */}
        <h2 className="font-display font-black text-2xl sm:text-4xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 mb-1 text-glow-cyan">
          {currentSlide.title}
        </h2>
        <h3 className="text-xs sm:text-sm font-mono text-amber-400 font-black uppercase tracking-widest mb-6">
          {currentSlide.subtitle}
        </h3>

        {/* Slide Text */}
        <p className="text-slate-200 text-sm sm:text-base leading-relaxed mb-8 max-w-xl mx-auto font-sans">
          {currentSlide.text}
        </p>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleNext}
            className="btn-shimmer w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-black tracking-widest text-sm shadow-[0_0_30px_rgba(0,240,255,0.5)] transition-all duration-200 transform hover:-translate-y-0.5"
          >
            {step < introSlides.length - 1 ? 'PROCEED // NEXT BRIEFING' : 'INITIALIZE OPTICAL SCANNER 🚀'}
          </button>
          
          {step < introSlides.length - 1 && (
            <button
              onClick={() => {
                sound.startAmbient();
                sound.playSuccess();
                onStartGame();
              }}
              className="text-xs font-mono font-bold text-slate-400 hover:text-cyan-300 transition-colors underline underline-offset-4"
            >
              Skip Briefing
            </button>
          )}
        </div>

        {/* Bottom Lore Note */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 text-xs font-mono text-cyan-400/80 flex items-center justify-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          <span>Computer Vision gesture recognition active. Audio is never recorded.</span>
        </div>

      </div>

    </div>
  );
}
