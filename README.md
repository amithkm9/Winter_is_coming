# ❄️ Winter is Coming · The Silent Resistance

*An AI webcam-powered 3D resistance game where your hands are your only weapon.*

Built for the {Tech: Europe} AI Gaming Hack, Paris, September 2026.

---

## 📖 The Story

A rogue super-intelligence called **NEXUS-PARIS** has taken over the city's smart grid and plunged Paris into an eternal **Artificial Winter**. It controls every network, every radio and every microphone. Any word spoken aloud is intercepted instantly.

But the machine has one blind spot: it was never trained to understand human hands.

The last free humans have gone silent and now communicate only through **sign language**. Choose one of three resistance couriers, infiltrate the frozen city, and take back Paris one sector at a time.

## 🎯 The Goal

Explore Paris, liberate all **5 sectors**, and shut down the AI core.

Behind the mission, the real goal of the game is to **teach you the basics of sign language**. Every sector introduces new signs to learn, and by the time you reach the final showdown, you will have built a real vocabulary of signs, without ever opening a textbook. No prior experience needed.

## ✨ Features

- **Real-time 3D exploration** across 5 Parisian sectors, plus a safe Training Academy to practise your signs.
- **3 unique couriers:** play as Elio, Mira or Noor.
- **Webcam sign recognition:** Google MediaPipe tracks your hand live and checks your signs.
- **Gesture-based relay calibration:** transmit silent ciphers to reclaim each sector.
- **Collectible coins:** gather cute coins along the way to unlock the Vault, where you can learn more sign language.
- **Mobile and desktop support:** play in your browser with keyboard and mouse, or on mobile with on-screen joysticks and touch buttons.

## 🕹️ How to Play

1. **Allow camera access.** The game uses your webcam to track your hand in real time. Nothing is recorded or stored.
2. **Pick your courier** and start in the Training Academy to learn your first signs.
3. **Explore the sector** and find the frozen communication relays hidden around it. Collect the cute coins you find on your way: they lead you to the Vault, where you can learn sign language.
4. **Walk up to a relay and interact.** A guide card shows the sign's name, its meaning, and how to position your fingers.
5. **Perform the sign** in front of your camera. A skeleton overlay shows how the game sees your hand, and a confidence bar shows how close you are.
6. **Watch out for AI drones.** If you stay inside a drone's red scan zone for more than 5 seconds, you get kicked out of the game.

Calibrate every relay in a sector to liberate it and unlock the next one.

## 🎮 Controls

| Action | Keyboard / Mouse | Mobile |
| :--- | :--- | :--- |
| Move | WASD or Arrow keys | Virtual joystick |
| Look around | Mouse drag | Touch drag |
| Interact / Calibrate | E | Interact button |
| Sprint | Shift | Run toggle |
| Perform a sign | Your hand, in front of the webcam | Your hand, in front of the camera |
| Sign input (fallback) | Keys 1 to 6 or click a sign | Touch the sign buttons |
| Pause | Escape | Pause button |

**Tip:** play in a well-lit room and keep your whole hand inside the camera frame.

## 🗺️ Why Different Sectors?

Each level is a real corner of Paris taken over by the AI: the **Louvre Courtyard**, **Canal Saint-Martin**, the **Botanical Glasshouse**, the **Paris Observatory**, and finally **the Spire**, where the AI core waits.

The sectors form a learning path:

- **New sector, new signs.** Each one adds signs to your vocabulary.
- **Rising difficulty.** Early relays need a single sign; later ones ask for sequences of signs, under heavier drone patrols.
- **The final test.** At the Spire, you must combine everything you have learned to shut down NEXUS-PARIS for good.

Liberate every sector and Paris sees the sun again. ☀️

---

## 🛠️ Tech

React + Vite + TypeScript frontend with three.js for the 3D world, Python FastAPI backend, and Google MediaPipe for real-time hand tracking and gesture recognition.
