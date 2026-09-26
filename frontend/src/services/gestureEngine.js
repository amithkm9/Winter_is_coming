import { FilesetResolver, GestureRecognizer, HandLandmarker } from '@mediapipe/tasks-vision';

/**
 * High-performance browser-based Hand & Gesture Engine
 * Combines MediaPipe ML models with high-speed geometric landmark heuristics.
 */

// Hand landmark connection pairs for rendering the cyber skeleton
export const HAND_CONNECTIONS = [
  // Palm
  [0, 1], [0, 5], [9, 13], [13, 17], [0, 17], [5, 9],
  // Thumb
  [1, 2], [2, 3], [3, 4],
  // Index
  [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [17, 18], [18, 19], [19, 20]
];

class GestureVisionEngine {
  constructor() {
    this.recognizer = null;
    this.landmarker = null;
    this.isReady = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.isReady) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );

        // Load Gesture Recognizer
        this.recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 1
        });

        this.isReady = true;
        console.log("⚡ MediaPipe Gesture Vision Engine initialized on GPU/WASM");
        return true;
      } catch (err) {
        console.warn("Gesture recognizer unavailable, trying landmark-only CPU pipeline:", err);
        try {
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
          );
          this.landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'CPU'
            },
            runningMode: 'VIDEO',
            numHands: 1
          });
          this.isReady = true;
          console.log("Hand landmarker ready — geometric heuristic classifier active");
          return true;
        } catch (fallbackErr) {
          this.initPromise = null;
          throw fallbackErr;
        }
      }
    })();

    return this.initPromise;
  }

  /**
   * Process a single video frame and return landmarks + classified gesture
   */
  detect(videoElement) {
    if (!videoElement || videoElement.readyState < 2) {
      return null;
    }

    let mlGesture = null;
    let landmarks = null;
    const now = performance.now();

    if (!this.recognizer && this.landmarker) {
      try {
        const results = this.landmarker.detectForVideo(videoElement, now);
        if (results && results.landmarks && results.landmarks.length > 0) {
          landmarks = results.landmarks[0];
        }
      } catch (e) {
        // Frame dropped or skipped
      }
    }

    if (this.recognizer) {
      try {
        const results = this.recognizer.recognizeForVideo(videoElement, now);
        if (results && results.landmarks && results.landmarks.length > 0) {
          landmarks = results.landmarks[0];
          if (results.gestures && results.gestures.length > 0 && results.gestures[0].length > 0) {
            mlGesture = results.gestures[0][0];
          }
        }
      } catch (e) {
        // Frame dropped or skipped
      }
    }

    if (!landmarks) {
      return null;
    }

    // Run geometric classifier to verify/enrich ML prediction
    const heuristicResult = this.classifyLandmarks(landmarks);

    let finalGesture = heuristicResult.gesture;
    let confidence = heuristicResult.confidence;

    // Merge with MediaPipe model if confidence is high
    if (mlGesture && mlGesture.score > 0.75) {
      const mlCategory = mlGesture.categoryName.toLowerCase();
      if (mlCategory.includes('victory') || mlCategory.includes('peace')) {
        finalGesture = 'PEACE';
        confidence = Math.max(confidence, mlGesture.score);
      } else if (mlCategory.includes('closed_fist')) {
        finalGesture = 'RESISTANCE_FIST';
        confidence = Math.max(confidence, mlGesture.score);
      } else if (mlCategory.includes('open_palm')) {
        finalGesture = 'OPEN_PALM';
        confidence = Math.max(confidence, mlGesture.score);
      } else if (mlCategory.includes('pointing_up') || mlCategory.includes('pointing')) {
        finalGesture = 'POINT_TARGET';
        confidence = Math.max(confidence, mlGesture.score);
      } else if (mlCategory.includes('thumb_up')) {
        finalGesture = 'THUMBS_UP';
        confidence = Math.max(confidence, mlGesture.score);
      } else if (mlCategory.includes('iloveyou')) {
        finalGesture = 'LOVE_HOPE';
        confidence = Math.max(confidence, mlGesture.score);
      }
    }

    return {
      gesture: finalGesture,
      confidence: Math.round(confidence * 100),
      rawConfidence: confidence,
      landmarks,
      heuristicDetails: heuristicResult.details
    };
  }

  /**
   * Geometric 3D landmark classifier for accurate sign detection
   */
  classifyLandmarks(lm) {
    if (!lm || lm.length < 21) {
      return { gesture: 'UNKNOWN', confidence: 0, details: {} };
    }

    const wrist = lm[0];
    
    // Distance helper
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y, (p1.z || 0) - (p2.z || 0));

    // Finger extensions relative to wrist & MCP joints
    const isExtended = (tipIdx, pipIdx, mcpIdx) => {
      const dTip = dist(lm[tipIdx], wrist);
      const dPip = dist(lm[pipIdx], wrist);
      const dMcp = dist(lm[mcpIdx], wrist);
      return (dTip > dPip * 1.05) && (lm[tipIdx].y < lm[pipIdx].y || dTip > dMcp * 1.25);
    };

    const isFolded = (tipIdx, pipIdx, mcpIdx) => {
      const dTip = dist(lm[tipIdx], wrist);
      const dPip = dist(lm[pipIdx], wrist);
      return dTip < dPip * 0.95 || lm[tipIdx].y > lm[pipIdx].y;
    };

    const indexUp = isExtended(8, 6, 5);
    const middleUp = isExtended(12, 10, 9);
    const ringUp = isExtended(16, 14, 13);
    const pinkyUp = isExtended(20, 18, 17);

    const indexFolded = isFolded(8, 6, 5);
    const middleFolded = isFolded(12, 10, 9);
    const ringFolded = isFolded(16, 14, 13);
    const pinkyFolded = isFolded(20, 18, 17);

    // Thumb metrics
    const thumbTip = lm[4];
    const indexTip = lm[8];
    const middleTip = lm[12];
    const pinkyTip = lm[20];

    const thumbIndexDist = dist(thumbTip, indexTip);
    const indexMiddleDist = dist(indexTip, middleTip);
    const thumbUp = thumbTip.y < lm[3].y && thumbTip.y < lm[2].y && dist(thumbTip, wrist) > dist(lm[2], wrist) * 1.1;

    let gesture = 'UNKNOWN';
    let confidence = 0.5;

    // 1. PINCH / KEY (Thumb and Index touching, forming a key cipher)
    if (thumbIndexDist < 0.08 && !indexUp) {
      gesture = 'PINCH_KEY';
      confidence = 0.92;
    }
    // 2. OK SIGN / CIPHER_LOCK (Thumb and Index touching, Middle/Ring/Pinky extended)
    else if (thumbIndexDist < 0.08 && middleUp && pinkyUp) {
      gesture = 'OK_SIGN';
      confidence = 0.95;
    }
    // 3. PEACE / V-SIGN (Index & Middle UP, Ring & Pinky FOLDED)
    else if (indexUp && middleUp && ringFolded && pinkyFolded && indexMiddleDist > 0.035) {
      gesture = 'PEACE';
      confidence = 0.96;
    }
    // 4. CROSS / FAITH (Index & Middle UP but touching / crossed)
    else if (indexUp && middleUp && ringFolded && pinkyFolded && indexMiddleDist <= 0.035) {
      gesture = 'CROSS_FAITH';
      confidence = 0.90;
    }
    // 5. LOVE / HOPE (ILY Sign: Thumb, Index, Pinky UP, Middle & Ring FOLDED)
    else if (indexUp && pinkyUp && middleFolded && ringFolded) {
      gesture = 'LOVE_HOPE';
      confidence = 0.94;
    }
    // 6. CALL / SHAKA (Thumb & Pinky OUT, Index, Middle, Ring FOLDED)
    else if (pinkyUp && indexFolded && middleFolded && ringFolded && thumbUp) {
      gesture = 'CALL_SIGNAL';
      confidence = 0.91;
    }
    // 7. POINT / TARGET (Index UP, others FOLDED)
    else if (indexUp && middleFolded && ringFolded && pinkyFolded) {
      gesture = 'POINT_TARGET';
      confidence = 0.94;
    }
    // 8. OPEN PALM / SHIELD (All fingers UP)
    else if (indexUp && middleUp && ringUp && pinkyUp) {
      gesture = 'OPEN_PALM';
      confidence = 0.95;
    }
    // 9. RESISTANCE FIST (All fingers FOLDED)
    else if (indexFolded && middleFolded && ringFolded && pinkyFolded) {
      gesture = 'RESISTANCE_FIST';
      confidence = 0.93;
    }
    // 10. THUMBS UP (Thumb UP, 4 fingers folded)
    else if (thumbUp && indexFolded && middleFolded && ringFolded) {
      gesture = 'THUMBS_UP';
      confidence = 0.90;
    }

    return {
      gesture,
      confidence,
      details: {
        indexUp, middleUp, ringUp, pinkyUp, thumbUp,
        thumbIndexDist: Math.round(thumbIndexDist * 1000) / 1000,
        indexMiddleDist: Math.round(indexMiddleDist * 1000) / 1000
      }
    };
  }

  /**
   * Draw high-tech glowing cyberpunk hand skeleton and HUD targeting telemetry onto canvas
   */
  drawSkeleton(ctx, landmarks, width, height, isTargetMatched = false) {
    if (!ctx || !landmarks || landmarks.length === 0) return;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Coordinate helper (Mirrored for natural selfie cam)
    const toScreen = (lm) => ({
      x: (1 - lm.x) * width,
      y: lm.y * height
    });

    const primaryColor = isTargetMatched ? '#10b981' : '#00f0ff';
    const secondaryColor = isTargetMatched ? '#34d399' : '#38bdf8';
    const glowColor = isTargetMatched ? 'rgba(16, 185, 129, 0.9)' : 'rgba(0, 240, 255, 0.85)';

    // Compute bounding box for holographic bracket
    let minX = width, maxX = 0, minY = height, maxY = 0;
    landmarks.forEach(lm => {
      const p = toScreen(lm);
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const pad = 24;
    minX = Math.max(0, minX - pad);
    maxX = Math.min(width, maxX + pad);
    minY = Math.max(0, minY - pad);
    maxY = Math.min(height, maxY + pad);

    // Draw holographic bounding brackets around tracked hand
    ctx.strokeStyle = isTargetMatched ? 'rgba(16, 185, 129, 0.6)' : 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = glowColor;

    const bLen = 16;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(minX, minY + bLen); ctx.lineTo(minX, minY); ctx.lineTo(minX + bLen, minY); ctx.stroke();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(maxX - bLen, minY); ctx.lineTo(maxX, minY); ctx.lineTo(maxX, minY + bLen); ctx.stroke();
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(minX, maxY - bLen); ctx.lineTo(minX, maxY); ctx.lineTo(minX + bLen, maxY); ctx.stroke();
    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(maxX - bLen, maxY); ctx.lineTo(maxX, maxY); ctx.lineTo(maxX, maxY - bLen); ctx.stroke();

    // Draw palm web energy triangle
    const wrist = toScreen(landmarks[0]);
    const indexMCP = toScreen(landmarks[5]);
    const pinkyMCP = toScreen(landmarks[17]);

    ctx.beginPath();
    ctx.moveTo(wrist.x, wrist.y);
    ctx.lineTo(indexMCP.x, indexMCP.y);
    ctx.lineTo(pinkyMCP.x, pinkyMCP.y);
    ctx.closePath();
    ctx.fillStyle = isTargetMatched ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 240, 255, 0.08)';
    ctx.fill();

    // Draw connection lines with neon glow
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = primaryColor;

    HAND_CONNECTIONS.forEach(([i, j]) => {
      const p1 = toScreen(landmarks[i]);
      const p2 = toScreen(landmarks[j]);

      const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      grad.addColorStop(0, primaryColor);
      grad.addColorStop(1, secondaryColor);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = grad;
      ctx.stroke();
    });

    // Draw landmark joints
    landmarks.forEach((lm, idx) => {
      const p = toScreen(lm);
      const isTip = [4, 8, 12, 16, 20].includes(idx);
      const radius = isTip ? 6.5 : (idx === 0 ? 7 : 4);

      // Outer glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isTip ? (isTargetMatched ? '#ffffff' : '#e0f2fe') : primaryColor;
      ctx.shadowBlur = isTip ? 16 : 8;
      ctx.shadowColor = isTip ? '#ffffff' : glowColor;
      ctx.fill();

      // Targeting reticle on Index tip (8) & Wrist (0)
      if (isTip) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.strokeStyle = isTargetMatched ? '#34d399' : '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    });

    // Draw wrist targeting telemetry ring
    const now = performance.now() * 0.002;
    ctx.beginPath();
    ctx.arc(wrist.x, wrist.y, 18, now, now + Math.PI * 1.4);
    ctx.strokeStyle = isTargetMatched ? '#10b981' : '#00f0ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}

export const gestureVision = new GestureVisionEngine();
