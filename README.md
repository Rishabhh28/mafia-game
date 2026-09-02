# 🕵️ Mafia — Real-Time Multiplayer Voice & Social Deduction Game

[![Node.js](https://img.shields.io/badge/Node.js-v16%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-black.svg)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-blue.svg)](https://socket.io/)
[![WebRTC](https://img.shields.io/badge/WebRTC-PeerJS-red.svg)](https://peerjs.com/)
[![License](https://img.shields.io/badge/License-MIT-gold.svg)](LICENSE)

**Mafia** is a modern, immersive, real-time multiplayer social deduction web application. Players enter a shared room code to experience secret role assignment, high-stakes night actions, live WebRTC voice discussion, encrypted faction channels, and voting.

> *"Trust no one. Survive the night."*

---

## ✨ Features

- 🎙️ **Real-Time Proximity Voice Chat**: Low-latency voice communication during Day discussion using PeerJS (WebRTC) backed by Google STUN servers for reliable cross-device audio.
- 💬 **Town Discussion & Text Chat**: Built-in public text chat window with system alerts, ghost tags for spectators/eliminated players, and quick-phrase action chips.
- 🤫 **Encrypted Faction Channels**: Private night chat channels for the Mafia Syndicate and Doctors to coordinate tactics in secrecy.
- 📜 **Interactive Rules & How to Play**: Built-in quick guide box on the home page and an accessible tabbed pop-up Modal UI window available anywhere in the app.
- 🃏 **Dynamic Role Assignment & Ratios**: Automatic balance scaling for Mafia, Doctor, and Innocent Townspeople based on room player count.
- ☀️🌙 **Immersive Atmospheric UI**: Cinematic dark mode aesthetics with Cinzel & Crimson Pro typography, 3D card flip animations, and interactive speaking indicators.
- ⚡ **Seamless Reconnection & Host Controls**: Room codes for quick joining, host migration, and round break control panels.

---

## 🎭 Roles & Objectives

| Role | Faction | Night Ability | Objective |
| :--- | :--- | :--- | :--- |
| **🕵️ Mafia** | Syndicate | Secretly vote on a target player to eliminate | Eliminate Townspeople until Mafia equal or outnumber Innocents |
| **🩺 Doctor** | Savior | Protect one player from night attack | Save attack victims and help Innocents vote out all Mafia |
| **👤 Innocent** | Town | None (Rely on voice/chat deduction & voting) | Identify and vote out all hidden Mafia members |

---

## 🛠️ Tech Stack

- **Backend Runtime**: Node.js & Express.js
- **Real-Time Engine**: Socket.IO (Room management, phase synchronization, text messaging)
- **Voice Stream Engine**: WebRTC via PeerJS + Google STUN servers (`stun.l.google.com:19302`)
- **Frontend Architecture**: HTML5, Vanilla CSS3 (Custom Design Tokens, Flexbox/Grid, Glassmorphism, Animations), ES6 JavaScript

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- npm (Node Package Manager)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Rishabhh28/mafia-game.git
   cd mafia-game
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory (or copy from `.env.example`):
   ```env
   PORT=3000
   MAX_PLAYERS=20
   KILL_TIMER_SECONDS=60
   HEAL_TIMER_SECONDS=45
   DISCUSSION_SECONDS=180
   VOTE_TIMER_SECONDS=60
   RECONNECT_WINDOW_MS=30000
   ```

4. **Start the server:**

   - **Development mode (with nodemon):**
     ```bash
     npm run dev
     ```

   - **Production mode:**
     ```bash
     npm start
     ```

5. **Open in browser:**
   Navigate to `http://localhost:3000` on your desktop or mobile devices.

---

## 📂 Project Structure

```
mafia-game/
├── public/
│   ├── css/
│   │   ├── base.css          # Core CSS variables, typography & layout reset
│   │   ├── components.css    # UI buttons, modals, cards & chat windows
│   │   └── game.css          # Gameplay specific layouts & timer bar
│   ├── js/
│   │   ├── audio.js          # PeerJS WebRTC voice stream & audio context manager
│   │   ├── card-flip.js      # 3D role reveal card interaction
│   │   ├── faction-chat.js   # Private Mafia/Doctor night chat module
│   │   ├── game-state.js     # Shared client state & session storage
│   │   ├── rules.js          # Interactive How to Play modal UI controller
│   │   ├── socket-client.js  # Socket.IO connection & error handlers
│   │   ├── town-chat.js      # Public Town Discussion text chat controller
│   │   └── ui.js             # UI rendering helpers & timer bar logic
│   ├── index.html            # Main landing & room join page
│   ├── lobby.html            # Pre-game lobby room table
│   └── game.html             # Active gameplay, night/day phases & scoreboard
├── .env.example              # Environment variables template
├── package.json              # Project dependencies & scripts
├── server.js                 # Express server & Socket.IO game orchestrator
└── README.md                 # Project documentation
```

---

## 🎮 How to Play

1. **Create or Join a Room:** Enter your nickname and either click **Create Room** or input a 6-character room code to join an existing game.
2. **Lobby & Ready Up:** Wait for players to join. Once at least 4 players are connected and ready, the host starts the game.
3. **Role Reveal:** Click your secret role card to flip and inspect your assigned role (**Mafia**, **Doctor**, or **Innocent**).
4. **Night Phase:** 
   - **Mafia** open their private channel to vote on a target.
   - **Doctor** selects a target to heal.
5. **Day Discussion:** Dawn breaks! Survived players enter live voice chat and public text discussion to debate clues.
6. **Voting Phase:** Cast your vote to eliminate the player most suspected of being Mafia.
7. **Scoreboard & Next Round:** Round scores update and the host can trigger subsequent rounds!

---

## 📜 License

This project is licensed under the MIT License — feel free to fork, modify, and build upon it.
