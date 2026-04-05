# Warp Protocol: Dark Pulse

A real-time multiplayer grid warfare game inspired by Battleship, built with Next.js and Firebase. Players place defensive cores on a 10x10 grid and take turns firing at each other's grids. First to destroy all opponent cores wins.

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS with a custom cyberpunk/dark theme
- **Database**: Firebase Firestore (real-time sync)
- **Deployment**: Vercel

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your Firebase project credentials:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Commands

| Command         | Description                        |
|-----------------|------------------------------------|
| `npm run dev`   | Start dev server at localhost:3000 |
| `npm run build` | Production build                   |
| `npm start`     | Start production server            |
| `npm run lint`  | Run ESLint                         |

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

## Game Rules

### Cores

Each player places all 5 cores on their 10x10 grid before the battle begins:

| Core             | Size | Flavor                                              |
|------------------|------|-----------------------------------------------------|
| Pulse Core       | 2    | Short-range signal emitter. Fragile but agile.      |
| Dark Core I      | 3    | Stealth power module. Hard to locate, easy to lose. |
| Dark Core II     | 3    | Redundant power relay. One breach, and entropy begins. |
| Warp Core        | 4    | Primary drive matrix. Destruction is non-recoverable. |
| Singularity Core | 5    | The nexus of all system operations. Protect at all costs. |

### Phases

1. **Waiting** — A second player joins via game ID.
2. **Placement** — Both players place their 5 cores (horizontal or vertical).
3. **Playing** — Players alternate firing at each other's grids.
4. **Finished** — The first player to destroy all opponent cores wins.

### How to play

- Create a game in the lobby and share the game ID with your opponent.
- Drag or click to place each core on your grid, toggling orientation as needed.
- Once both players confirm placement, the battle begins.
- On your turn, click a cell on the enemy grid to fire. Hits are highlighted; misses are marked.
- A core is destroyed when every one of its cells has been hit.

## Architecture Notes

- **Player identity** is UUID-based (no authentication). Two players on the same browser share the same UUID — use different browsers or incognito mode for local testing.
- **All game state** lives in Firestore. Components subscribe to real-time updates via Firestore listeners.
- **Firestore security rules** (`firestore.rules`) currently allow all reads/writes — tighten before production.
- **Path alias** `@/*` maps to the project root (configured in `tsconfig.json`).
- **Fonts**: Orbitron for display text, Share Tech Mono for monospace.
