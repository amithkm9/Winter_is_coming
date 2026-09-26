import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TacticalMap from './components/TacticalMap';
import WebcamTerminal from './components/WebcamTerminal';
import MissionModal from './components/MissionModal';
import SignDictionaryModal from './components/SignDictionaryModal';
import CinematicIntro from './components/CinematicIntro';
import VictoryScreen from './components/VictoryScreen';
import SnowEffect from './components/SnowEffect';
import { ARRONDISSEMENTS } from './data/arrondissements';
import { sound } from './services/sound';

const STORAGE_KEY = 'winter_is_coming_game_save_v1';

export default function App() {
  const [hasSeenIntro, setHasSeenIntro] = useState(() => {
    return localStorage.getItem('winter_is_coming_intro_seen') === 'true';
  });

  const [liberatedIds, setLiberatedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.liberatedIds || [];
      }
    } catch (e) {}
    return [];
  });

  const [score, setScore] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.score || 0;
      }
    } catch (e) {}
    return 0;
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSector, setSelectedSector] = useState(null);
  const [activeMissionSector, setActiveMissionSector] = useState(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [showCodex, setShowCodex] = useState(false);
  const [isVictory, setIsVictory] = useState(false);

  // Auto-save progress to localStorage
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ liberatedIds, score })
    );

    // Check for Victory condition (all 16 sectors liberated)
    if (liberatedIds.length >= ARRONDISSEMENTS.length && ARRONDISSEMENTS.length > 0) {
      setIsVictory(true);
    }
  }, [liberatedIds, score]);

  // Handle Sector Click on Map
  const handleSelectSector = (sector) => {
    setSelectedSector(sector);
  };

  // Launch Live Webcam Mission for a Sector
  const handleStartMission = (sector) => {
    setSelectedSector(null);
    setActiveMissionSector(sector);
    setIsPracticeMode(false);
  };

  // On Mission Completed Successfully
  const handleMissionComplete = (sector) => {
    if (!liberatedIds.includes(sector.id)) {
      setLiberatedIds(prev => [...prev, sector.id]);
      setScore(prev => prev + (sector.score || 500));
    }
    setActiveMissionSector(null);
  };

  // On Mission Failed
  const handleMissionFail = (reason) => {
    alert(reason || "Mission aborted. AI defenses countered your cipher.");
    setActiveMissionSector(null);
  };

  // Reset Game Data
  const handleResetGame = () => {
    setLiberatedIds([]);
    setScore(0);
    setIsVictory(false);
    setActiveMissionSector(null);
    setSelectedSector(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col relative overflow-x-hidden">
      
      {/* Background Falling Snow Particle Canvas */}
      <SnowEffect liberatedCount={liberatedIds.length} totalCount={ARRONDISSEMENTS.length} />

      {/* Cyberpunk Top Navbar */}
      <Navbar
        liberatedCount={liberatedIds.length}
        totalCount={ARRONDISSEMENTS.length}
        score={score}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onOpenCodex={() => setShowCodex(true)}
        onOpenPractice={() => {
          setActiveMissionSector(null);
          setIsPracticeMode(true);
        }}
        onResetGame={handleResetGame}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 relative z-10 flex flex-col gap-6">
        
        {/* If Active Mission or Practice Mode is active, show the Webcam Terminal HUD */}
        {(activeMissionSector || isPracticeMode) ? (
          <WebcamTerminal
            sector={activeMissionSector}
            isPractice={isPracticeMode}
            onMissionComplete={handleMissionComplete}
            onMissionFail={handleMissionFail}
            onClose={() => {
              setActiveMissionSector(null);
              setIsPracticeMode(false);
            }}
          />
        ) : (
          /* Otherwise, show the Interactive Tactical Paris Map */
          <TacticalMap
            arrondissements={ARRONDISSEMENTS}
            liberatedIds={liberatedIds}
            onSelectSector={handleSelectSector}
            activeSectorId={selectedSector?.id}
          />
        )}

      </main>

      {/* Briefing Modal */}
      {selectedSector && (
        <MissionModal
          sector={selectedSector}
          onStartMission={handleStartMission}
          onClose={() => setSelectedSector(null)}
        />
      )}

      {/* Sign Language Codex / Practice Modal */}
      {showCodex && (
        <SignDictionaryModal
          onTestSign={(sign) => {
            setShowCodex(false);
            setIsPracticeMode(true);
          }}
          onClose={() => setShowCodex(false)}
        />
      )}

      {/* Cinematic Intro (Shown on first visit or when triggered) */}
      {!hasSeenIntro && (
        <CinematicIntro
          onStartGame={() => {
            setHasSeenIntro(true);
            localStorage.setItem('winter_is_coming_intro_seen', 'true');
          }}
        />
      )}

      {/* Grand Victory Screen (When all 16 sectors are liberated) */}
      {isVictory && (
        <VictoryScreen
          score={score}
          onPlayAgain={() => {
            handleResetGame();
          }}
        />
      )}

      {/* Bottom Status Ticker */}
      <footer className="border-t border-cyan-500/10 bg-[#030612]/90 py-2.5 px-4 text-center text-xs font-mono text-slate-500 relative z-10">
        <span>WINTER IS COMING // POWERED BY GOOGLE MEDIAPIPE COMPUTER VISION & REACT // TECH: EUROPE PARIS</span>
      </footer>

    </div>
  );
}
