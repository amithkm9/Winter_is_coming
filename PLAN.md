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

---

## 4. Technical Architecture

### 4.1 System Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             CLIENT (BROWSER)                             │
├────────────────────────────────┬─────────────────────────────────────────┤
│          UI / GAMEPLAY         │           VISION & AI ENGINE            │
│  - React / Next.js / Vite      │  - Google MediaPipe Gesture Recognizer  │
│  - Tailwind CSS / Framer Motion│  - 21 3D Hand Landmarks @ 60 FPS        │
│  - Lucide Icons & SFX WebAudio │  - Custom Gesture Rule Classifier       │
│  - Interactive SVG Paris Map   │  - Multimodal Gemini API (Optional for  │
│  - HTML5 Video Cinematic Player│    dynamic commentary & lore validation)│
└────────────────────────────────┴─────────────────────────────────────────┘
                                 │ (HTTPS / WebSockets)
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         BACKEND / SERVICES (OPTIONAL)                    │
│  - Node.js / Express or FastAPI                                          │
│  - Game State Persistence & Leaderboards (Local / Supabase)              │
│  - Multimodal AI Prompting (Gemini 1.5/2.0 Flash)                        │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Tech Stack Selection

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Framework** | **React / Vite / TypeScript** (or Next.js) | Extremely fast startup, instant HMR, zero setup hurdles for hackathon judges, friction-free browser deployment. |
| **Styling & UI** | **Tailwind CSS + Framer Motion** | Cinematic cyberpunk HUD animations, glitch effects, smooth district transitions. |
| **Vision AI** | **Google MediaPipe Tasks Vision** (`@mediapipe/tasks-vision`) | Google DeepMind partner alignment; runs locally in browser via WebAssembly/GPU; ultra-low latency (<20ms); zero cloud cost/rate limits. |
| **Secondary AI** | **Gemini 2.0 Flash / Gemini 1.5 Pro** | Generates dynamic resistance commander briefings and AI boss dialogue reacting to player performance. |
| **Map Visualization** | **Interactive Vector SVG / Canvas Paris Map** | Crisp rendering of the 16 arrondissements, responsive hover effects, dynamic territory coloration. |
| **Audio & SFX** | **Web Audio API / Howler.js** | Ambient dystopian drones, cybernetic sound effects, satisfying unlock chimes. |

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

### Phase 1: Foundation & Project Scaffolding
- [x] Repository initialized with Git workflow and branch protection.
- [ ] Initialize modern React + TypeScript + Vite project structure.
- [ ] Setup Tailwind CSS with custom dystopian color palette (neon cyan, glitch crimson, cryogenic white, resistance gold).
- [ ] Embed video player component for opening intro sequence.

### Phase 2: Computer Vision & Hand Sign Engine
- [ ] Integrate `@mediapipe/tasks-vision` HandLandmarker and GestureRecognizer.
- [ ] Implement camera feed capture with mirror mode and landmark overlay canvas.
- [ ] Build gesture matcher with confidence threshold and hold-duration accumulator.
- [ ] Create a "Sign Guide Card" modal showing player how to position fingers.

### Phase 3: Paris Map & Game State Engine
- [ ] Implement interactive vector map of the 16 Paris arrondissements.
- [ ] Create game state manager (current district, unlocked districts, completion stats).
- [ ] Build district reclamation animations (particle dissipation, color shift from ice to gold).

### Phase 4: Audio, Polish & Lore Integration
- [ ] Dystopian ambient soundtrack and sound effects for sign confirmation and AI alerts.
- [ ] AI dialogue handler (Nexus-Paris taunts vs. Resistance handler instructions).
- [ ] Victory screen cinematic sequence upon completing all 16 districts.

### Phase 5: Testing, Deployment & Presentation Demo
- [ ] End-to-end playtesting in varied lighting conditions and webcam resolutions.
- [ ] Deploy live playable demo to Vercel / GitHub Pages.
- [ ] Prepare 2-minute pitch deck & video walkthrough for judges (Google DeepMind & VOODOO).

---

## 7. Key Success Metrics for Judging
1. **Innovation & Theme:** Unique application of AI vision (sign language as gameplay mechanic) perfectly matching the AI takeover resistance narrative.
2. **Accessibility:** Introduces players to real sign language fundamentals in an intuitive, engaging game format.
3. **Polish & Experience:** Atmospheric cyberpunk aesthetics, responsive 60 FPS gesture recognition, and visceral visual feedback.
