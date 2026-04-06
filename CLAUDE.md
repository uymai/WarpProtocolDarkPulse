# CLAUDE.md

## Project Overview

**Warp Protocol: Dark Pulse** is a real-time multiplayer grid warfare game (Battleship-style) built with Next.js and Firebase. Players place defensive "cores" on a 10x10 grid and take turns firing at each other's grids. First to destroy all opponent cores wins.

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom cyberpunk/dark theme
- **Database**: Firebase Firestore (real-time sync)
- **Deployment**: Vercel

## Common Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint
```

## Environment Setup

1. Copy `.env.local.example` to `.env.local` and fill in Firebase credentials:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

2. Enable **Anonymous Authentication** in the Firebase Console:
   Firebase Console → Authentication → Sign-in method → Anonymous → Enable

## Project Structure

```
app/                        # Next.js App Router pages
  page.tsx                  # Lobby/home page
  layout.tsx                # Root layout (fonts, global styles)
  game/[gameId]/page.tsx    # Dynamic game page
components/                 # React UI components
  CorePlacer.tsx            # Core placement UI during setup phase
  CoreStatusPanel.tsx       # Shows remaining cores for each player
  GameStatusBar.tsx         # Turn indicator and game status
  Grid.tsx                  # 10x10 interactive game grid
  LobbyForm.tsx             # Create/join game form
  ShotResult.tsx            # Hit/miss feedback display
lib/                        # Utilities and business logic
  firebase.ts               # Firebase app initialization
  firestore.ts              # Firestore CRUD operations
  gameLogic.ts              # Game rules, win conditions, shot resolution
  uuid.ts                   # Player UUID generation/storage (localStorage)
types/
  game.ts                   # TypeScript interfaces for game state
```

## Game Logic

**Core types** (defined in `types/game.ts`):
- Pulse Core: 2 cells
- Dark Core I & II: 3 cells each
- Warp Core: 4 cells
- Singularity Core: 5 cells

**Game phases**: `waiting` → `placement` → `playing` → `finished`

**State management**: All game state lives in Firestore. Components subscribe to real-time updates via Firestore listeners. Player identity is a UUID stored in `localStorage`.

## Key Architectural Notes

- Player identity is UUID-based (no auth). Two players on the same browser share the same UUID — use different browsers or incognito mode for local testing.
- Firestore security rules (`firestore.rules`) currently allow all reads/writes — tighten before production.
- Path alias `@/*` maps to the project root (configured in `tsconfig.json`).
- Fonts: Orbitron for display text, Share Tech Mono for monospace.
