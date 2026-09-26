import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Sparkles, CheckCircle, AlertTriangle, Clock, ShieldCheck, Zap, HelpCircle } from 'lucide-react';
import { gestureVision } from '../services/gestureEngine';
import { SIGN_DICTIONARY } from '../data/signDictionary';
import { sound } from '../services/sound';
import { useMissionSession } from '../hooks/useMissionSession';
import { localSignFor } from '../data/signBridge';

export default function WebcamTerminal({
  sector,
  isPractice = false,
  onMissionComplete,
  onMissionFail,
  onClose
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const signSuccessRef = useRef(() => {});

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Vision / Gesture Detection State
  const [detectedGesture, setDetectedGesture] = useState('SEARCHING');
  const [confidence, setConfidence] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100%

  // Mission Progression State
  const [missionState, setMissionState] = useState({
    phase: 0,
    sequenceIdx: 0,
    timeLeft: 20,
    activeTarget: null,
    isCompleted: false,
    isFailed: false
  });

  // Server-authoritative mission run (backend task engine, Phase 3).
  // Falls back to the district profile in data/arrondissements.js when offline.
  const server = useMissionSession(sector?.id, Boolean(sector) && !isPractice);

  // Determine current active target sign
  const getTargetSignId = () => {
    if (isPractice) return null;
    if (server.online && server.targetSignId) return server.targetSignId;
    if (!sector) return 'PEACE';

    if (sector.missionType === 'SINGLE_SIGN') {
      return sector.targetSign;
    } else if (sector.missionType === 'SEQUENCE') {
      return sector.sequenceSigns[missionState.sequenceIdx] || sector.sequenceSigns[0];
    } else if (sector.missionType === 'SPEED_DEFENSE') {
      return sector.speedSigns[missionState.sequenceIdx] || sector.speedSigns[0];
    } else if (sector.missionType === 'NEXUS_BOSS') {
      return sector.bossPhases[missionState.phase]?.sign || 'PEACE';
    }
    return 'PEACE';
  };

  const currentTargetSignId = getTargetSignId();
  const currentTargetSign = currentTargetSignId ? SIGN_DICTIONARY[currentTargetSignId] : null;
  const requiredHoldSec = server.online
    ? server.currentStep?.holdDurationSec ?? 1.5
    : sector?.holdDuration ?? 1.5;
  const isTimedMission =
    server.online ||
    sector?.missionType === 'SEQUENCE' ||
    sector?.missionType === 'SPEED_DEFENSE' ||
    sector?.missionType === 'NEXUS_BOSS';

  // Initialize Camera & Vision Model
  useEffect(() => {
    let stream = null;

    const initVision = async () => {
      try {
        await gestureVision.initialize();

        // Request webcam
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraActive(true);
          };
        }
      } catch (err) {
        console.warn("Webcam access unavailable or denied:", err);
        setHasCamera(false);
        setCameraError("Camera permission not granted. Virtual Gesture mode is enabled!");
      }
    };

    initVision();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Timer countdown for timed / speed missions
  useEffect(() => {
    if (isPractice || missionState.isCompleted || missionState.isFailed) return;

    if (isTimedMission) {
      const initialTime = server.online
        ? server.mission?.timeLimitSeconds || 20
        : sector.timeLimit || 20;
      setMissionState(prev => ({ ...prev, timeLeft: initialTime }));

      const timer = setInterval(() => {
        setMissionState(prev => {
          if (prev.timeLeft <= 1) {
            clearInterval(timer);
            sound.playFail();
            if (onMissionFail) onMissionFail("AI Counter-measure timed out! Mission failed.");
            return { ...prev, timeLeft: 0, isFailed: true };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [sector, missionState.sequenceIdx, missionState.phase, isPractice, isTimedMission, server.online, server.mission]);

  // Main Computer Vision Detection Loop
  useEffect(() => {
    let lastHoldTime = null;
    let accumulatedHold = 0;
    const requiredHoldTime = requiredHoldSec * 1000;

    const processFrame = () => {
      if (videoRef.current && canvasRef.current && cameraActive) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        const result = gestureVision.detect(video);

        if (result && result.landmarks) {
          const matched = currentTargetSignId ? result.gesture === currentTargetSignId : true;

          // Draw neon cyber skeleton on canvas
          gestureVision.drawSkeleton(ctx, result.landmarks, canvas.width, canvas.height, matched);

          setDetectedGesture(result.gesture);
          setConfidence(result.confidence);

          // Hold Progress Logic
          if (matched && result.confidence >= 75) {
            const now = performance.now();
            if (lastHoldTime) {
              const delta = now - lastHoldTime;
              accumulatedHold += delta;
              const progress = Math.min(100, Math.round((accumulatedHold / requiredHoldTime) * 100));
              setHoldProgress(progress);

              if (progress % 25 === 0 && progress > 0) {
                sound.playHoldTick(progress / 100);
              }

              if (accumulatedHold >= requiredHoldTime) {
                signSuccessRef.current(result.confidence);
                accumulatedHold = 0;
                lastHoldTime = null;
              }
            }
            lastHoldTime = now;
          } else {
            accumulatedHold = Math.max(0, accumulatedHold - 30);
            setHoldProgress(Math.min(100, Math.round((accumulatedHold / requiredHoldTime) * 100)));
            lastHoldTime = null;
          }
        } else {
          // Clear canvas if no hands
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setDetectedGesture('NO_HAND');
          setConfidence(0);
          accumulatedHold = 0;
          setHoldProgress(0);
          lastHoldTime = null;
        }
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cameraActive, currentTargetSignId, sector, requiredHoldSec]);

  // Handle successful gesture completion
  const handleSignSuccess = async (detectedConfidence = confidence) => {
    sound.playSuccess();
    setHoldProgress(0);

    if (isPractice) return;

    if (!sector) return;

    if (server.online) {
      const result = await server.reportHold(detectedConfidence);
      if (result) {
        if (!result.accepted) return;
        if (result.completed) {
          setMissionState(prev => ({ ...prev, isCompleted: true }));
          if (onMissionComplete) onMissionComplete(sector);
        }
        return;
      }
      // Backend dropped mid-mission: continue with the offline profile below.
    }

    if (sector.missionType === 'SINGLE_SIGN') {
      setMissionState(prev => ({ ...prev, isCompleted: true }));
      if (onMissionComplete) onMissionComplete(sector);
    } else if (sector.missionType === 'SEQUENCE' || sector.missionType === 'SPEED_DEFENSE') {
      const list = sector.sequenceSigns || sector.speedSigns;
      const nextIdx = missionState.sequenceIdx + 1;

      if (nextIdx >= list.length) {
        setMissionState(prev => ({ ...prev, isCompleted: true }));
        if (onMissionComplete) onMissionComplete(sector);
      } else {
        setMissionState(prev => ({ ...prev, sequenceIdx: nextIdx }));
      }
    } else if (sector.missionType === 'NEXUS_BOSS') {
      const nextPhase = missionState.phase + 1;
      if (nextPhase >= sector.bossPhases.length) {
        setMissionState(prev => ({ ...prev, isCompleted: true }));
        if (onMissionComplete) onMissionComplete(sector);
      } else {
        setMissionState(prev => ({ ...prev, phase: nextPhase }));
      }
    }
  };

  signSuccessRef.current = handleSignSuccess;

  // Virtual Gesture trigger (for testing / without webcam)
  const triggerVirtualSign = (signKey) => {
    sound.playClick();
    setDetectedGesture(signKey);
    setConfidence(98);
    setHoldProgress(100);
    setTimeout(() => {
      handleSignSuccess(98);
    }, 400);
  };

  return (
    <div className="relative w-full cyber-card rounded-2xl p-4 sm:p-7 shadow-2xl backdrop-blur-2xl border border-cyan-500/40">
      
      {/* Decorative Sci-Fi HUD Corner Brackets */}
      <div className="hud-corner-tl" />
      <div className="hud-corner-tr" />
      <div className="hud-corner-bl" />
      <div className="hud-corner-br" />

      {/* Header Info */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <h3 className="font-display font-black text-xl sm:text-2xl text-white tracking-wider text-glow-cyan">
              {isPractice ? 'OPTICAL GESTURE SCANNER // PRACTICE' : `MISSION // ${sector?.name}`}
            </h3>
          </div>
          <p className="text-xs text-cyan-300 font-mono mt-0.5">
            {isPractice
              ? 'CALIBRATE YOUR OPTICAL RESISTANCE CIPHERS IN REAL-TIME'
              : `TARGET AI DAEMON: ${sector?.aiNode} // AMBIENT: ${sector?.temperature}`}
          </p>
        </div>

        {/* Timer / Exit Button */}
        <div className="flex items-center gap-3">
          {isTimedMission && !isPractice && (
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-mono text-base font-black border ${
              missionState.timeLeft <= 5
                ? 'bg-red-950 border-red-500 text-red-300 shadow-[0_0_15px_#ff0055] animate-pulse'
                : 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
            }`}>
              <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
              <span>{missionState.timeLeft}s</span>
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="text-xs font-mono font-bold px-4 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all"
            >
              EXIT SCANNER
            </button>
          )}
        </div>
      </div>

      {/* Resistance Handler Briefing (streamed from the backend task engine) */}
      {server.online && server.mission && (
        <div className="relative z-10 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
          <div className="bg-slate-950/90 border-l-4 border-cyan-400 p-3.5 rounded-r-2xl">
            <div className="text-[10px] font-bold text-cyan-400 mb-1">
              RESISTANCE HANDLER // TIER {server.mission.difficultyTier} // {server.mission.missionType}
            </div>
            <p className="text-slate-200 leading-relaxed">{server.mission.narrative.handlerBriefing}</p>
          </div>
          <div className="bg-slate-950/90 border-l-4 border-red-500 p-3.5 rounded-r-2xl">
            <div className="text-[10px] font-bold text-red-400 mb-1">
              {server.mission.bossNode} // COUNTERMEASURE: {server.mission.counterMeasure}
            </div>
            <p className="text-slate-300 italic leading-relaxed">"{server.mission.narrative.aiTaunt}"</p>
          </div>
        </div>
      )}

      {/* Main Grid: Video Stream + Target Sign HUD */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Webcam Stream & Skeleton Overlay (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_30px_rgba(0,240,255,0.2)] flex items-center justify-center">
            
            {/* Video Feed */}
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
            />

            {/* Glowing Hand Skeleton Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
            />

            {/* CRT Scanline & Holographic Vignette Effect */}
            <div className="absolute inset-0 crt-overlay pointer-events-none z-20 opacity-50" />
            <div className="absolute inset-0 hologram-vignette pointer-events-none z-20" />

            {/* Camera Fallback / Error Message */}
            {!cameraActive && (
              <div className="relative z-30 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 max-w-sm rounded-2xl border border-cyan-500/30 shadow-2xl backdrop-blur-xl">
                <Camera className="w-12 h-12 text-cyan-400 animate-pulse mb-3" />
                <h4 className="font-display font-bold text-white text-base mb-1">
                  {cameraError ? 'Camera Stream Offline' : 'Calibrating Optical Sensors...'}
                </h4>
                <p className="text-xs text-slate-400 font-mono mb-4 leading-relaxed">
                  {cameraError || 'Grant camera permission when prompted by your browser.'}
                </p>
                <div className="text-xs font-mono text-cyan-300 bg-cyan-950/80 px-3.5 py-2 rounded-lg border border-cyan-500/40">
                  ⚡ Virtual Simulator Buttons below are active!
                </div>
              </div>
            )}

            {/* Live Telemetry Overlay on Bottom of Video */}
            <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between bg-[#020614]/90 border border-cyan-500/40 rounded-xl p-3 backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-slate-400">VISION:</span>
                <span className={`font-black tracking-wider ${
                  detectedGesture === currentTargetSignId
                    ? 'text-emerald-400 text-glow-green'
                    : 'text-cyan-300'
                }`}>
                  {detectedGesture === 'NO_HAND' ? '👋 SHOW HAND TO CAMERA' : (SIGN_DICTIONARY[detectedGesture]?.name || detectedGesture)}
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-slate-400">ACCURACY:</span>
                <span className={`font-black ${confidence >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {confidence}%
                </span>
              </div>
            </div>

          </div>

          {/* Hold-to-Override Progress Bar */}
          {!isPractice && currentTargetSign && (
            <div className="mt-4 bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 shadow-lg">
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="text-slate-300 flex items-center gap-2 font-bold">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  HOLD GESTURE TO OVERRIDE FIREWALL:
                </span>
                <span className={`font-black ${holdProgress >= 100 ? 'text-emerald-400 text-glow-green' : 'text-cyan-300'}`}>
                  {holdProgress}%
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-3.5 overflow-hidden border border-cyan-500/30">
                <div
                  className={`h-full transition-all duration-100 ${
                    holdProgress >= 100
                      ? 'bg-emerald-400 shadow-[0_0_20px_#10b981]'
                      : 'bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400'
                  }`}
                  style={{ width: `${holdProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Required Sign Instruction & Guide Card (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          
          {/* Target Sign Card */}
          {currentTargetSign ? (
            <div className="bg-[#07112b]/90 border-2 border-cyan-400/60 rounded-2xl p-6 shadow-[0_0_25px_rgba(0,240,255,0.2)]">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-3">
                <span className="text-xs font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-400 text-cyan-300">
                  REQUIRED SIGN CIPHER
                </span>
                <span className="text-3xl animate-bounce">{currentTargetSign.symbol}</span>
              </div>

              <h4 className="font-display font-black text-white text-xl mb-1 text-glow-cyan">
                {currentTargetSign.name}
              </h4>
              <p className="text-xs text-amber-400 font-mono mb-4 font-bold">
                {currentTargetSign.meaning}
              </p>

              {/* Hand Posture Instructions */}
              <div className="bg-slate-950/90 rounded-xl p-3.5 border border-slate-800/90 mb-3">
                <div className="text-[11px] font-mono text-cyan-400 mb-1 font-bold">
                  ✋ PHYSICAL POSTURE:
                </div>
                <div className="text-xs text-slate-200 leading-relaxed font-sans">
                  {currentTargetSign.instruction}
                </div>
              </div>

              {/* Mnemonic / Hint */}
              <div className="text-xs font-mono text-cyan-300/90 italic">
                💡 Hint: {currentTargetSign.mnemonic}
              </div>

              {/* Server Mission Sequence Indicator */}
              {server.online && server.totalSteps > 1 && (
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="text-xs font-mono text-cyan-400 mb-2 font-bold">
                    CIPHER SEQUENCE PROGRESS // STEP {server.stepIndex + 1} OF {server.totalSteps}:
                  </div>
                  <div className="flex items-center gap-2">
                    {server.mission.requiredSequence.map((step, idx) => (
                      <div
                        key={step.step}
                        className={`flex-1 flex flex-col items-center p-2 rounded-xl border text-center transition-all ${
                          idx === server.stepIndex
                            ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.5)] scale-105'
                            : idx < server.stepIndex
                            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                            : 'bg-slate-900/80 border-slate-800 text-slate-600'
                        }`}
                      >
                        <span className="text-base">
                          {SIGN_DICTIONARY[localSignFor(step.gestureKey)]?.symbol || '✋'}
                        </span>
                        <span className="text-[10px] font-mono font-bold mt-1">
                          {idx < server.stepIndex ? 'DONE' : idx === server.stepIndex ? 'ACTIVE' : `P${idx + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sequence Steps Indicator */}
              {!server.online && (sector?.missionType === 'SEQUENCE' || sector?.missionType === 'SPEED_DEFENSE') && (
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="text-xs font-mono text-cyan-400 mb-2 font-bold">
                    CIPHER SEQUENCE PROGRESS:
                  </div>
                  <div className="flex items-center gap-2">
                    {(sector.sequenceSigns || sector.speedSigns).map((sKey, idx) => (
                      <div
                        key={idx}
                        className={`flex-1 flex flex-col items-center p-2 rounded-xl border text-center transition-all ${
                          idx === missionState.sequenceIdx
                            ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.5)] scale-105'
                            : idx < missionState.sequenceIdx
                            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                            : 'bg-slate-900/80 border-slate-800 text-slate-600'
                        }`}
                      >
                        <span className="text-base">{SIGN_DICTIONARY[sKey]?.symbol || '✋'}</span>
                        <span className="text-[10px] font-mono font-bold mt-1">
                          {idx < missionState.sequenceIdx ? 'DONE' : idx === missionState.sequenceIdx ? 'ACTIVE' : `P${idx+1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Boss Phases */}
              {!server.online && sector?.missionType === 'NEXUS_BOSS' && (
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="text-xs font-mono text-red-400 mb-2 font-bold">
                    BOSS PHASES // {sector.bossPhases[missionState.phase]?.name}:
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {sector.bossPhases.map((phase, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-xl border text-center text-xs font-mono font-bold ${
                          idx === missionState.phase
                            ? 'bg-red-950 border-red-500 text-red-300 animate-pulse shadow-[0_0_10px_#ff0055]'
                            : idx < missionState.phase
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                            : 'bg-slate-900 border-slate-800 text-slate-600'
                        }`}
                      >
                        P{idx + 1}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-[#07112b]/90 border border-cyan-500/40 rounded-2xl p-6 text-center">
              <Sparkles className="w-10 h-10 text-cyan-400 mx-auto mb-2 animate-pulse" />
              <h4 className="font-display font-black text-white text-lg mb-1 text-glow-cyan">
                PRACTICE ARENA ACTIVE
              </h4>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Form any sign with your hand in front of the camera. The optical AI detector will recognize it instantly!
              </p>
            </div>
          )}

          {/* Fallback Virtual Gesture Trigger Simulator Buttons */}
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2.5">
              <span className="font-bold text-slate-300">VIRTUAL GESTURE SIMULATOR</span>
              <span className="text-[11px] text-cyan-400">(Click to emulate sign)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(SIGN_DICTIONARY).map(sign => (
                <button
                  key={sign.id}
                  onClick={() => triggerVirtualSign(sign.id)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left text-xs font-mono transition-all transform hover:-translate-y-0.5 ${
                    sign.id === currentTargetSignId
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-200 hover:bg-cyan-900 shadow-[0_0_12px_rgba(0,240,255,0.4)] font-bold'
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-base">{sign.symbol}</span>
                  <span className="truncate">{sign.name.split('/')[0]}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
