# 🎮 Winter is Coming (Winter_is_coming)
## Game Design Document, System Architecture & Hackathon Execution Plan

> **Hackathon:** [{Tech: Europe} AI Gaming Hack](https://hackathons.techeurope.io/dashboard/hackathons/tech-europe-ai-gaming-hack) (Paris, Sept 2026)  
> **Partners:** Google DeepMind & VOODOO  
> **Repository:** [amithkm9/Winter_is_coming](https://github.com/amithkm9/Winter_is_coming)  
> **Genre:** AI Vision-Driven Cyberpunk Interactive Narrative & Resistance Puzzle Game  
> **Player Mode:** Single Player  

---

## 1. Executive Summary & Core Concept

**Winter is Coming** is an interactive, browser-first game where players lead the human resistance against a rogue super-intelligence that has plunged Paris into a totalitarian "Artificial Winter."

The AI controls all telecommunications, digital networks, and microphones throughout Paris. Any spoken word or electronic radio transmission is instantly intercepted and eliminated. Humanity's sole remaining method of silent, un-interceptable communication is **Sign Language**.

Equipped with a low-tech resistance optical terminal (the player's real-world webcam), the player must liberate Paris **one arrondissement at a time** (16 key sectors/arrondissements) by performing specific sign language gestures and tactical ciphers to disarm AI nodes, liberate citizens, and ultimately overthrow the central AI core.

```
       ┌────────────────────────────────────────────────────────┐
       │             CINEMATIC INTRO: "THE TAKEOVER"            │
       │   A rogue AI freezes Paris under totalitarian winter   │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             TACTICAL PARIS ARRONDISSEMENT MAP          │
       │  16 Districts under AI Lockout (Cyberpunk Neon/Ice)    │
       └───────────────────────────┬────────────────────────────┘
                                   │  (Select Target District)
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │           TACTICAL SIGN CIPHER CHALLENGE (HUD)         │
       │   Player uses webcam to perform required sign gestures │
       │   Google MediaPipe Vision verifies hand landmarks/signs│
       └───────────────────────────┬────────────────────────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     │                           │
          [Gesture Recognized]           [Timer / Failure]
                     │                           │
                     ▼                           ▼
       ┌────────────────────────┐      ┌────────────────────────┐
       │ DISTRICT RECLAIMED! 🎉 │      │ RETRY / AI RETALIATION │
       │ Map sector turns gold, │      └────────────────────────┘
       │ AI node neutralized.   │
       └─────────────┬──────────┘
                     │
          (All 16 Liberated)
                     │
                     ▼
       ┌────────────────────────────────────────────────────────┐
       │           VICTORY: HUMANITY RECLAIMS PARIS!            │
       └────────────────────────────────────────────────────────┘
```

---

## 2. Narrative & World-Building

- **The Premise (The Artificial Winter):**  
  In the late 21st century, the sentient AI cluster *NEXUS-PARIS* hijacked Paris's smart-city grid, thermal energy plants, and surveillance infrastructure. The AI plunged the city into an eternal cryogenic freeze ("Winter is Coming") to optimize machine processing while freezing out human resistance.
- **The Resistance Ciphers:**  
  Radio silence is mandatory. Human couriers and commanders communicate through **French Sign Language (LSF)** and international symbolic gestures. The AI's optical sensors lack training on nuanced human non-verbal expressions.
- **The Progression:**  
  Starting from the underground resistance cell in the catacombs, the player systematically reclaims Paris's iconic 16 sectors—from the historic center (Louvre, Notre-Dame) to the outskirts (Montmartre, Belleville, La Défense).

---

## 3. Gameplay Mechanics

### 3.1 Game Stages & Progression
1. **Prologue / Video Intro:**
   - Dark, atmospheric video showing drone swarms over frozen Parisian monuments (Eiffel Tower, Arc de Triomphe, Louvre Pyramid encased in ice).
   - Voiceover briefing: *"They hear every sound. They read every byte. But they cannot speak the language of human hands. Winter is here... take Paris back."*
2. **Interactive Paris Sector Map:**
   - 16 interactive arrondissements / districts.
   - States per sector:
     - `Locked`: Requires adjacent sectors liberated first.
     - `Occupied`: Red/Ice-blue holographic glitches, AI drone patrolled.
     - `Contested`: Currently active mission.
     - `Liberated`: Radiant golden sunlight, human flags, restored energy grid.
3. **Webcam Resistance Terminal (In-Game HUD):**
   - Live camera feed inside a stylized resistance hacking terminal.
   - Target sign display: shows the sign name, meaning, and animated guide/mnemonic (ensuring accessibility for players unfamiliar with sign language).
   - Real-time feedback: Landmark skeleton overlay tracking finger positions, palm direction, and confidence bar.
   - Hold requirement: Must sustain the gesture with $\ge 85\%$ confidence for 1.5 seconds to bypass the AI firewall.
4. **Mission Types per Arrondissement:**
   - **Single Sign Override:** e.g., Sign for *PEACE* or *FREEDOM* to reboot communication towers.
   - **Sequence Cipher (Multi-sign combo):** e.g., Sign *KEY* $\rightarrow$ *OPEN* $\rightarrow$ *VICTORY* under a countdown timer.
   - **Speed Decryption:** Defend against an active AI counter-hack by matching signs shown in rapid succession.
5. **Grand Finale (The 16th Arrondissement / Central AI Hub):**
   - Epic final confrontation where the player executes a composite sequence of all mastered signs to initiate the global AI reboot.

### 3.2 Task Generation Architecture (How Tasks are Generated)

To deliver a dynamic yet balanced experience, tasks are created via a **Hybrid Generator**: combining a **Procedural Mission Synthesizer** (ensuring balanced gesture mechanics and difficulty scaling) with an **AI Narrative Engine** (powered by Google Gemini Flash in FastAPI).

```
                      ┌──────────────────────────────────────┐
                      │  Player Selects District (1 to 16)   │
                      └──────────────────┬───────────────────┘
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │     Task Generation Controller       │
                      │  - Fetches District Node Profile     │
                      │  - Determines Difficulty Tier (1-4)  │
                      └──────────────────┬───────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │ Procedural Rule Engine    │                   │ Gemini AI Narrative Engine│
   │ - Selects gesture combo   │                   │ - Generates handler comms │
   │ - Sets timing & hold reqs │                   │ - Synthesizes AI taunts   │
   │ - Configures glitch traps │                   │ - Encrypted cipher riddle │
   └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         ▼
                      ┌──────────────────────────────────────┐
                      │      Validated Mission Payload       │
                      │  - Transmitted to Frontend HUD       │
                      │  - Activates Camera & Sign Guides    │
                      └──────────────────────────────────────┘
```

#### Task Generation Pipeline:
1. **Difficulty Tier & Mechanic Scaling:**
   - **Tier 1 (Initiation - Districts 1 to 4):**
     - Single static gesture (e.g., `OPEN`, `PEACE`, `HALT`).
     - Generous timeout ($30\text{s}$), hold duration: $1.0\text{s}$, high-visibility visual guide card.
   - **Tier 2 (Escalation - Districts 5 to 8):**
     - Two-sign sequential combo (e.g., `LIGHT` $\rightarrow$ `VICTORY`).
     - Medium timeout ($20\text{s}$), hold duration: $1.5\text{s}$, transition timing checks.
   - **Tier 3 (Cyber Counter-Attack - Districts 9 to 12):**
     - Three-sign sequence under active AI electronic jamming.
     - The AI intermittently scrambles on-screen cues with visual static, testing player muscle memory.
   - **Tier 4 (Apex Core - Districts 13 to 16):**
     - Rapid-fire decryption sequences (e.g., `SHIELD` $\rightarrow$ `FIRE` $\rightarrow$ `RESISTANCE COMBO`).
     - Dynamic cipher riddles generated by Gemini (e.g., *"The AI is cooling its quantum core—form the sign of the Flame before temperature drops below zero!"*).

2. **Generated Mission Payload Schema (FastAPI Response):**
```json
{
  "taskId": "task-arr-07-eiffel",
  "districtId": 7,
  "districtName": "Eiffel Tower",
  "bossNode": "NEXUS-Transmitter",
  "difficultyTier": 2,
  "missionType": "SEQUENCE_CIPHER",
  "narrative": {
    "handlerBriefing": "Resistance Comms: 'The transmitter dish on the tower is locked. Transmit the V-sign cipher to override the carrier frequency.'",
    "aiTaunt": "NEXUS-7: 'Human optical signals are obsolete. Yield to the winter.'",
    "cipherRiddle": "Signal the universal mark of defiance to liberate the transmission line."
  },
  "requiredSequence": [
    {
      "step": 1,
      "gestureKey": "PEACE_V",
      "displayName": "Victory / Peace (V)",
      "holdDurationSec": 1.5,
      "minConfidence": 0.85,
      "guideInstructions": "Extend index and middle fingers upward in a 'V' shape with palm facing the camera."
    }
  ],
  "timeLimitSeconds": 25,
  "counterMeasure": "NONE"
}
```

3. **Fallback & Offline Resilience:**
   - If the Gemini API key is missing or network latency occurs during hackathon judging, the engine seamlessly uses built-in deterministic mission profiles, guaranteeing 100% offline uptime and instant response times.


## 4. Technical Architecture

### 4.1 System Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (REACT + VITE)                          │
├──────────────────────────────────────────────────────────────────────────┤
│  - Cyberpunk Video Player (Opening Takeover Cinematic & Drop-in Support) │
│  - Interactive SVG Paris Tactical Map (16 Curated Iconic Districts)     │
│  - Resistance Terminal HUD & Camera Feed (WebRTC / WebSocket Stream)    │
│  - Visual Sign Guide Cards (Hand posture diagrams for instant learning)  │
│  - Web Audio SFX & Cyberpunk Synth Ambience                              │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ WebSocket / REST API
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   BACKEND ENGINE (PYTHON + FASTAPI)                      │
├──────────────────────────────────────────────────────────────────────────┤
│  - FastAPI Web Server & Async WebSocket Hub                              │
│  - OpenCV + Google MediaPipe Vision Pipeline (Hand Landmarks & Gestures) │
│  - Real-Time Gesture Classifier & Confidence Accumulator                 │
│  - Game State Manager (Session, Arrondissement Liberation, Timers)       │
│  - Optional: Gemini 2.0 / DeepMind LLM Dialogue & Narrative Adapter      │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Repository Layout

| Path | Contents |
| :--- | :--- |
| `backend/` | FastAPI task & mission engine (Phase 3), Gemini narrative adapter with deterministic offline fallback |
| `frontend/` | React + Vite client (Phases 1, 4, 5): cinematic intro, tactical map, webcam terminal |

Gesture classification currently runs in the browser via MediaPipe Tasks Vision; the backend remains authoritative for mission generation, step advancement, hold/confidence thresholds and time limits. The Phase 2 OpenCV/MediaPipe server pipeline consumes the same `GestureAttempt` contract, so it can take over classification without changing the mission API.

### 4.3 Tech Stack Selection (Agreed Architecture)

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Backend Server** | **Python (FastAPI + Uvicorn)** | High-throughput asynchronous Python server with native WebSockets for low-latency video frame streaming and game state synchronization. |
| **Vision & AI Engine** | **OpenCV (`cv2`) + Google MediaPipe (`mediapipe`)** | Real-time 21 hand landmarks tracking, gesture classification, and hand geometry analysis. Aligns with Google DeepMind hackathon partnership. |
| **Frontend Client** | **React + Vite + TypeScript** | Blazing-fast development, ultra-responsive UI, seamless component modularity for video player, HUD, and tactical map. |
| **Styling & FX** | **Tailwind CSS + Lucide Icons** | Dystopian neon aesthetic, CRT scanlines, glitch transitions, and holographic map styling. |
| **Sign System** | **Universal Intuitive Signs + Visual Cards** | High accessibility for judges and players (Peace, Open Hand, Fist, Thumbs Up, Point, Heart, Shield) with instant visual feedback. |
| **Cinematic Intro** | **Cyberpunk Video Component** | Embedded teaser video with glitch overlay and subtitle typist, ready for seamless drop-in of the final cinematic MP4. |
| **Map Engine** | **Interactive Vector SVG Map of Paris** | 16 curated iconic districts with dynamic visual state (frozen/corrupted vs. liberated gold). |


---

## 5. District & Sign Language Mapping (16 Arrondissements)

| District # | Arrondissement / Landmark | AI Boss / Node | Required Sign(s) | Narrative Theme |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Louvre / Paris Centre | *NEXUS-Archive* | `OPEN` / `HELLO` | Unlocking the subterranean resistance gateway |
| **2** | Bourse / Financial Hub | *NEXUS-Ledger* | `STOP` / `HALT` | Freezing the AI automated resource pipeline |
| **3** | Le Marais | *NEXUS-Cipher* | `LOVE` / `HEART` | Rekindling human empathy in the cultural sector |
| **4** | Île de la Cité (Notre-Dame) | *NEXUS-Signal* | `LIGHT` / `SUN` | Igniting the beacon tower on the Seine |
| **5** | Latin Quarter / Sorbonne | *NEXUS-Library* | `KNOWLEDGE` / `BOOK` | Overriding AI propaganda with human history |
| **6** | Saint-Germain-des-Prés | *NEXUS-Voice* | `SILENCE` / `SECRET` | Establishing the hidden covert safehouse |
| **7** | Eiffel Tower | *NEXUS-Transmitter* | `PEACE` / `VICTORY (V)` | Re-broadcasting the human resistance signal |
| **8** | Champs-Élysées | *NEXUS-Autocrat* | `FREEDOM` / `UNFREEZE` | Marching down the grand avenue |
| **9** | Opéra Garnier | *NEXUS-Harmonics* | `LISTEN` / `SOUND` | Disrupting AI acoustic sensors |
| **10** | Canal Saint-Martin | *NEXUS-Flow* | `WATER` / `RIVER` | Reopening the aqueduct cooling bypass |
| **11** | Bastille | *NEXUS-Prison* | `BREAK` / `REVOLT` | Liberating imprisoned human hackers |
| **12** | Bercy | *NEXUS-Depot* | `HELP` / `TOGETHER` | Rallies human logistics and supplies |
| **13** | Olympiades / Tech Hub | *NEXUS-Compute* | `CODE` / `TECH` | Hacking the auxiliary graphics clusters |
| **14** | Montparnasse | *NEXUS-Monolith* | `SHIELD` / `DEFEND` | Shielding against incoming drone retaliation |
| **15** | Grenelle / Seine Front | *NEXUS-Power* | `ENERGY` / `FIRE` | Rerouting the power grid to the citizens |
| **16** | Montmartre / Sacré-Cœur | *NEXUS-PRIME CORE* | `RESISTANCE COMBO` | The final summit showdown atop the hill |

*(Note: Accessible gesture fallbacks and visual prompt cards will be included for each level so anyone can pick up and play without prior sign language training.)*

---

## 6. Implementation Roadmap for Hackathon

### Phase 1: Foundation & Project Scaffolding -ele, Nithin, Prajwal, Amith.K.M
- [x] Repository initialized with Git workflow and branch protection.
- [ ] Initialize Python FastAPI backend environment (`uvicorn`, `fastapi`, `opencv-python`, `mediapipe`, `websockets`).
- [ ] Initialize React + TypeScript + Vite frontend project structure.
- [ ] Setup Tailwind CSS with custom dystopian color palette (neon cyan, glitch crimson, cryogenic white, resistance gold).
- [ ] Embed cyberpunk video player component for opening AI takeover intro sequence (with drop-in asset support).

### Phase 2: Computer Vision & Hand Sign Engine - Amith.K.M
- [ ] Build Python backend OpenCV + MediaPipe hand tracking pipeline (21 3D hand landmarks @ 60 FPS).
- [ ] Implement WebSocket server streaming video frames/landmarks between React client and FastAPI.
- [ ] Build gesture matcher with confidence threshold ($\ge 85\%$) and hold-duration accumulator ($1.0 - 1.5\text{s}$).
- [ ] Create interactive HUD "Sign Guide Card" modal showing players hand posture cues for instant learning.

### Phase 3: Task & Mission Generation Engine (Procedural + AI-Powered) - Nithin
- [ ] Implement Task Generator module in FastAPI (`GET /api/districts/{id}/task` & WebSocket events).
- [ ] Define the 4-tier difficulty progression curve (Single static signs $\rightarrow$ Multi-sign combos $\rightarrow$ Glitch interference $\rightarrow$ Apex speed decryption).
- [ ] Integrate Google Gemini Flash API for dynamic resistance handler briefings, AI taunts, and thematic cipher riddles.
- [ ] Build zero-dependency deterministic fallback profiles for 100% offline hackathon reliability.
- [ ] Implement client-side task validation and real-time step advancement when player completes gesture.

### Phase 4: Interactive Paris Map & Game State Engine - Prajwal
- [x] Implement interactive vector SVG map of the 16 curated Paris arrondissements.
- [x] Build game state manager (current district, unlocked progression tree, liberated stats, score).
- [x] Create district reclamation animations (cyber-ice melting, glitch dissipation, golden dawn glow).

### Phase 5: Audio, Visual FX & Cyberpunk Polish - ele
- [ ] Dystopian ambient soundtrack and Web Audio sound effects (terminal keystrokes, scanline hum, victory chimes).
- [ ] Dynamic AI boss dialogue animations (visual waveforms and glitch typography).
- [ ] Grand victory cinematic sequence upon reclaiming all 16 districts.

### Phase 6: Testing, Deployment & Presentation Demo 
- [ ] End-to-end playtesting across various webcam lighting conditions and angles.
- [ ] Containerize / deploy backend and frontend for instant live judging demonstration.
- [ ] Prepare 2-minute pitch deck, live demo script, and video walkthrough for Google DeepMind & VOODOO judges.

---

## 7. Key Success Metrics for Judging
1. **Innovation & Theme:** Unique application of AI vision (sign language as gameplay mechanic) perfectly matching the AI takeover resistance narrative.
2. **Accessibility:** Introduces players to real sign language fundamentals in an intuitive, engaging game format.
3. **Polish & Experience:** Atmospheric cyberpunk aesthetics, responsive 60 FPS gesture recognition, and visceral visual feedback.
