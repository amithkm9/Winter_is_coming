import React, { useState } from 'react';
import { Shield, ShieldAlert, CheckCircle2, Lock, Flame, Zap, Crosshair, Radio, Activity, Terminal } from 'lucide-react';
import { sound } from '../services/sound';
import { SIGN_DICTIONARY } from '../data/signDictionary';

export default function TacticalMap({
  arrondissements,
  liberatedIds,
  onSelectSector,
  activeSectorId
}) {
  const [hoveredSector, setHoveredSector] = useState(null);

  const isLiberated = (id) => liberatedIds.includes(id);

  const isUnlocked = (sector) => {
    if (isLiberated(sector.id)) return true;
    if (!sector.unlockRequires || sector.unlockRequires.length === 0) return true;
    return sector.unlockRequires.some(reqId => liberatedIds.includes(reqId));
  };

  return (
    <div className="relative w-full cyber-card rounded-2xl p-4 sm:p-7 shadow-2xl backdrop-blur-2xl overflow-hidden border border-cyan-500/30">
      
      {/* Decorative Sci-Fi HUD Corner Brackets */}
      <div className="hud-corner-tl" />
      <div className="hud-corner-tr" />
      <div className="hud-corner-bl" />
      <div className="hud-corner-br" />

      {/* Background Cyber Grid & CRT Overlay */}
      <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 crt-overlay pointer-events-none opacity-40" />

      {/* Tactical Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/20 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]">
              <Crosshair className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-widest text-glow-cyan">
                PARIS HOLOGRAPHIC GRID
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>AI SURVEILLANCE OVERRIDE ACTIVE // 16 SECTOR CODEX</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono bg-slate-950/80 border border-slate-800/90 rounded-xl px-4 py-2">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
            <span className="font-bold">LIBERATED</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-pulse" />
            <span className="font-bold">INFILTRATE</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ff0055]" />
            <span className="font-bold">AI LOCKED</span>
          </div>
        </div>
      </div>

      {/* Interactive Paris Map Container */}
      <div className="relative w-full aspect-[16/10] max-h-[580px] flex items-center justify-center rounded-xl overflow-hidden bg-slate-950/60 border border-cyan-500/15">
        
        <svg
          viewBox="170 60 540 460"
          className="w-full h-full filter drop-shadow-[0_0_20px_rgba(0,240,255,0.15)] select-none"
        >
          <defs>
            {/* Holographic Glowing Gradients */}
            <linearGradient id="seineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="30%" stopColor="#00f0ff" stopOpacity="1" />
              <stop offset="70%" stopColor="#38bdf8" stopOpacity="1" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="radarSweep" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(0, 240, 255, 0.25)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="goldGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="redGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Radar Background Sweep Cones */}
          <g transform="translate(440, 310)" className="pointer-events-none opacity-40">
            <circle r="120" fill="none" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1" />
            <circle r="180" fill="none" stroke="rgba(56, 189, 248, 0.1)" strokeWidth="1" />
            <circle r="235" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" strokeDasharray="6 4" />
            <line x1="-240" y1="0" x2="240" y2="0" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1" />
            <line x1="0" y1="-240" x2="0" y2="240" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1" />
          </g>

          {/* Paris Outer Boundary Ring (Périphérique) */}
          <ellipse
            cx="440"
            cy="310"
            rx="235"
            ry="185"
            fill="none"
            stroke="rgba(56, 189, 248, 0.25)"
            strokeWidth="2.5"
            strokeDasharray="8 6"
          />

          {/* Seine River Curve (Illuminated Optical Channel) */}
          <path
            d="M 195,380 C 255,395 300,360 350,335 C 400,310 440,330 490,365 C 540,400 620,410 685,390"
            fill="none"
            stroke="url(#seineGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            filter="url(#neonGlow)"
          />
          <text x="215" y="420" fill="#00f0ff" fontSize="9" fontFamily="'Share Tech Mono', monospace" opacity="0.85" letterSpacing="2">
            LA SEINE // OPTICAL HYDRO-BUS
          </text>

          {/* Subterranean Data Conduits linking sectors */}
          {arrondissements.map(sector => {
            if (!sector.unlockRequires) return null;
            return sector.unlockRequires.map(reqId => {
              const source = arrondissements.find(a => a.id === reqId);
              if (!source) return null;
              const sourceLiberated = isLiberated(source.id);
              return (
                <line
                  key={`${source.id}-${sector.id}`}
                  x1={source.mapPos.x}
                  y1={source.mapPos.y}
                  x2={sector.mapPos.x}
                  y2={sector.mapPos.y}
                  stroke={sourceLiberated ? '#10b981' : 'rgba(56, 189, 248, 0.25)'}
                  strokeWidth={sourceLiberated ? '2.5' : '1.2'}
                  strokeDasharray={sourceLiberated ? 'none' : '5 4'}
                  filter={sourceLiberated ? 'url(#neonGlow)' : ''}
                />
              );
            });
          })}

          {/* Arrondissement Nodes */}
          {arrondissements.map(sector => {
            const liberated = isLiberated(sector.id);
            const unlocked = isUnlocked(sector);
            const isHovered = hoveredSector?.id === sector.id;
            const isBoss = sector.id === 16;
            const { x, y, r } = sector.mapPos;

            let fillColor = 'rgba(10, 18, 38, 0.9)';
            let strokeColor = 'rgba(71, 85, 105, 0.6)';
            let filterStyle = '';

            if (liberated) {
              fillColor = 'rgba(16, 185, 129, 0.35)';
              strokeColor = '#10b981';
              filterStyle = 'url(#goldGlow)';
            } else if (unlocked) {
              if (isBoss) {
                fillColor = 'rgba(255, 0, 85, 0.35)';
                strokeColor = '#ff0055';
                filterStyle = 'url(#redGlow)';
              } else {
                fillColor = 'rgba(0, 240, 255, 0.3)';
                strokeColor = '#00f0ff';
                filterStyle = 'url(#neonGlow)';
              }
            }

            return (
              <g
                key={sector.id}
                className={`cursor-pointer transition-all duration-300 ${
                  !unlocked ? 'opacity-40 cursor-not-allowed' : 'hover:scale-110'
                }`}
                onClick={() => {
                  if (unlocked) {
                    sound.playClick();
                    onSelectSector(sector);
                  } else {
                    sound.playFail();
                  }
                }}
                onMouseEnter={() => {
                  setHoveredSector(sector);
                  if (unlocked) sound.playClick();
                }}
                onMouseLeave={() => setHoveredSector(null)}
              >
                {/* Sector Base Hologram Circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? r + 5 : r}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isHovered ? '3.5' : '2'}
                  filter={filterStyle}
                  className="transition-all duration-200"
                />

                {/* Pulsing Tactical Ring for Unlocked/Active Nodes */}
                {unlocked && !liberated && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + 8}
                    fill="none"
                    stroke={isBoss ? '#ff0055' : '#00f0ff'}
                    strokeWidth="1.8"
                    strokeDasharray="6 3"
                    className="animate-spin"
                    style={{ transformOrigin: `${x}px ${y}px`, animationDuration: isBoss ? '4s' : '7s' }}
                  />
                )}

                {/* District Number Text */}
                <text
                  x={x}
                  y={y - 2}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={isBoss ? '14' : '11'}
                  fontFamily="'Orbitron', sans-serif"
                  fontWeight="900"
                  filter="drop-shadow(0 0 3px rgba(0,0,0,0.9))"
                >
                  {sector.number}
                </text>

                {/* Status Indicator Icon */}
                <text
                  x={x}
                  y={y + 13}
                  textAnchor="middle"
                  fontSize="11"
                >
                  {liberated ? '☀️' : (unlocked ? (isBoss ? '👑' : '🎯') : '🔒')}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover / Selected Sector Info Card Overlay */}
        {hoveredSector && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md bg-[#070f26]/95 border-2 border-cyan-400 rounded-2xl p-5 shadow-[0_0_35px_rgba(0,240,255,0.3)] backdrop-blur-2xl animate-fadeIn z-30">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                    SECTOR {hoveredSector.number}
                  </span>
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    {hoveredSector.temperature}
                  </span>
                </div>
                <h3 className="font-display font-black text-white text-lg mt-1 text-glow-cyan">
                  {hoveredSector.name}
                </h3>
              </div>

              <div className="text-right">
                {isLiberated(hoveredSector.id) ? (
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> LIBERATED
                  </span>
                ) : isUnlocked(hoveredSector) ? (
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.4)] animate-pulse">
                    <Zap className="w-3.5 h-3.5" /> READY
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                    <Lock className="w-3.5 h-3.5" /> LOCKED
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-300 font-sans mb-3 line-clamp-2 leading-relaxed">
              {hoveredSector.description}
            </p>

            {/* AI Node Lore Box */}
            <div className="bg-slate-950/90 border-l-4 border-red-500 p-2.5 rounded-r-lg text-[11px] font-mono text-red-300 mb-3">
              <div className="font-bold text-red-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>AI DAEMON: {hoveredSector.aiNode}</span>
              </div>
              <div className="italic text-slate-300 mt-1">"{hoveredSector.aiQuote}"</div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between text-xs font-mono pt-2.5 border-t border-slate-800">
              <span className="text-amber-400 font-bold">+{hoveredSector.score} PTS</span>
              {isUnlocked(hoveredSector) ? (
                <button
                  onClick={() => onSelectSector(hoveredSector)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-black tracking-wider transition-all transform hover:-translate-y-0.5 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                >
                  {isLiberated(hoveredSector.id) ? 'RE-ENGAGE 🎯' : 'INFILTRATE SECTOR 🎯'}
                </button>
              ) : (
                <span className="text-slate-400">Unlock adjacent sectors first</span>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
