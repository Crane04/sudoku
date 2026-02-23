client/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
│
└── src/
    │
    ├── main.tsx                          ← Vite entry, mounts <App />
    ├── App.tsx                           ← Phase router (Lobby ↔ Game)
    │
    ├── styles/
    │   ├── tokens.css                    ← ALL design tokens (colors, fonts, radii)
    │   └── global.css                    ← Reset, body, scrollbars, focus ring
    │
    ├── store/
    │   └── gameStore.ts                  ← Zustand — single source of truth
    │
    ├── socket/
    │   ├── socketClient.ts               ← io() singleton + all socket.emit wrappers
    │   └── socketEvents.ts               ← Binds server events → store actions
    │
    ├── types/
    │   └── game.ts                       ← All shared TS interfaces (Cell, Player, etc.)
    │
    └── components/
        │
        ├── Lobby/
        │   ├── Lobby.tsx                 ← Screen router: home / queue / create / join
        │   ├── Lobby.css
        │   ├── HomeScreen.tsx            ← 3 mode-cards (Quick / Private / Enter)
        │   ├── PublicQueueScreen.tsx     ← Name + difficulty → join queue
        │   ├── QueueWaitingScreen.tsx    ← Animated pulse rings + elapsed timer
        │   ├── CreateRoomScreen.tsx      ← Name + difficulty → create private room
        │   ├── RoomCodeScreen.tsx        ← 6-digit code display + copy button
        │   └── JoinRoomScreen.tsx        ← 6-input code entry + name field
        │
        ├── Game/
        │   ├── GameScreen.tsx            ← Board + sidebars + overlays composed here
        │   ├── GameScreen.css
        │   ├── BoardGrid.tsx             ← 9×9 <table>, cell selection, keyboard input
        │   ├── BoardGrid.css
        │   ├── Cell.tsx                  ← Single cell — clue / input / rejected states
        │   ├── ProgressBar.tsx           ← Animated fill bar (you + opponent)
        │   └── NumberPad.tsx             ← Mobile digit input (1–9 + erase)
        │
        ├── Countdown/
        │   ├── CountdownOverlay.tsx      ← 3-2-1-GO overlay, SVG ring, particles
        │   └── CountdownOverlay.css
        │
        ├── Victory/
        │   ├── VictoryOverlay.tsx        ← Win/loss screen + Play Again button
        │   └── VictoryOverlay.css
        │
        └── shared/
            ├── DifficultySelector.tsx    ← Novice / Adept / Master pill group
            ├── NameInput.tsx             ← Controlled input with char counter
            └── shared.css                ← Buttons, inputs, field labels