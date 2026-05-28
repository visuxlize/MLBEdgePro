# ⚾ MLBEdgePro

> **Status: Work In Progress** — Core features are functional. Active development ongoing. Expect breaking changes between commits.

A premium MLB companion app for iOS built with React Native + Expo. MLBEdgePro gives you real-time game data, deep player and pitcher analysis, a prop builder for constructing parlays, and a personal bet tracker — all in one focused tool.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started (Local Dev)](#getting-started-local-dev)
- [Getting the App on Your iPhone — No Computer Required](#getting-the-app-on-your-iphone--no-computer-required)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

MLBEdgePro is designed around one idea: **every tab is a tool, not a page**. Each screen serves a specific role in the pregame → in-game → postgame → betting workflow:

| Tab | Purpose |
|---|---|
| **Today** | Today's full slate — featured team card, stadium photos, weather, bet slip shortcut |
| **Scores** | Compact scoreboard across dates — pitcher matchups, R/H/E, deep analysis entry |
| **Analysis** | Head-to-head matchup breakdowns, pitcher vs batter stats, edge scores |
| **Builder** | Prop builder — HR, Hit, 2+ Hits, Pitcher K's — combined probability + parlay odds |
| **Settings** | Account, bet history tracker, win/loss stats |

---

## Features

### Today Tab
- Live game count with real-time status badges
- Featured game card for your favorite team — stadium photo, pitchers, weather overlay
- Weather chip on every game card: condition icon, temperature °F, wind direction arrows, speed
- **Bet Slips quick row** — shows active slip count, links directly to full history
- Check-in banner when saved slips are likely complete ("Did your slips win?")

### Scores Tab
- Compact **horizontal scoreboard cards** — scan results at a glance
- **7-day date chip strip** for instant date switching — no back/forward arrow tapping
- R / H / E stats inline on every card (errors highlighted red when nonzero)
- Starting pitcher headshot + last name per side
- **"Deep Analysis →"** CTA on finished/live games; **"Preview →"** on scheduled games
- Red pulse dot + inning shown live for in-progress games

### Analysis Tab
- Head-to-head matchup selector
- Pitcher season stats: ERA, WHIP, K/9, W/L record
- Batter season stats: AVG, OPS, HR, RBI
- Head-to-head history when available from MLB Stats API
- **Edge score** — weighted prediction score with reasoning breakdown

### Builder Tab (Props)
- 2×2 prop type grid: Home Run · Hit · 2+ Hits · Pitcher K's
- Player cards with official MLB headshots
- Live **combined probability** calculation with correct decimal precision
- **Save Slip** — persists to local storage, immediately visible across all tabs via shared context
- Implied American odds (break-even estimate) shown on the slip

### Bet Tracker
- Saved slips stored locally via AsyncStorage
- Per-slip detail sheet:
  - Player headshots + prop descriptions (clean, no redundant pitcher labels)
  - FanDuel odds input per leg
  - **Parlay payout math**: decimal product of all legs → `Math.floor((product-1)×100)` = exact FanDuel result
  - Wager + To Win fields
  - Won / Lost check-in
- Settings page: 3 most recent slips at-a-glance + "View All →"
- Full history page: Open / Won / Lost tabs, all slips with inline edit sheet
- Win rate %, total/won/lost counts

### App-Wide
- Custom dark theme (`#0A0E14` base, `#FF7828` primary orange)
- Liquid Glass tab bar (iOS 26+ native, blur fallback for older iOS)
- Safe area aware — Dynamic Island, home indicator, notch all handled
- React Query caching — weather 15 min stale, scores 1 min auto-refresh
- Shared React context for slip state — save in Builder, instantly visible in Settings

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Framework | Expo | ~56.0.5 |
| Router | Expo Router | ~56.2.7 |
| Language | TypeScript | ~6.0.3 |
| UI | React Native | 0.85.3 |
| Animations | react-native-reanimated | ^4.3.1 |
| Data fetching | TanStack React Query | ^5.100.14 |
| HTTP | Axios | ^1.16.1 |
| Local storage | @react-native-async-storage | 2.2.0 |
| Images | expo-image | ~56.0.9 |
| Gradients | expo-linear-gradient | ~56.0.4 |
| Icons | @expo/vector-icons (Ionicons) | ^15.0.2 |
| MLB data | MLB Stats API (free, no key required) | v1 |
| Weather | Open-Meteo API (free, no key required) | v1 |

---

## Project Structure

```
MLBEdgePro/
├── app/                          # Expo Router file-based routes
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab navigator
│   │   ├── games.tsx             # Today tab
│   │   ├── scores.tsx            # Scores tab
│   │   ├── matchups.tsx          # Analysis tab
│   │   ├── props.tsx             # Builder tab
│   │   └── settings-tab.tsx      # Settings + bet history
│   ├── game/[id].tsx             # Game detail / deep analysis
│   ├── player/[id].tsx           # Player profile
│   ├── bet-history.tsx           # Full bet history (all slips)
│   ├── auth/                     # Login + signup
│   ├── terms.tsx                 # Terms of Service v1.1
│   ├── privacy-policy.tsx        # Privacy Policy v1.1
│   └── _layout.tsx               # Root layout + global providers
│
├── src/
│   ├── api/
│   │   ├── mlb.ts                # MLB Stats API + TypeScript types
│   │   └── weather.ts            # Open-Meteo weather API
│   ├── components/
│   │   ├── AppBackground.tsx
│   │   ├── GameCard.tsx          # Game card with weather strip
│   │   ├── GlassCard.tsx
│   │   ├── LiquidGlassTabBar.tsx
│   │   ├── PlayerHeadshot.tsx    # MLB headshot with fallback initials
│   │   ├── TeamLogo.tsx          # Team logo with fallback
│   │   └── LoadingState.tsx
│   ├── constants/
│   │   ├── stadiums.ts           # Stadium lat/lon for weather lookup
│   │   └── queryKeys.ts
│   ├── contexts/
│   │   ├── SavedSlipsContext.tsx  # Global bet slip state (all tabs)
│   │   └── TabScrollContext.tsx
│   ├── hooks/
│   │   ├── useGames.ts
│   │   ├── useWeather.ts
│   │   ├── useSettings.ts
│   │   ├── useAuth.ts
│   │   ├── useSavedSlips.ts
│   │   └── useTabBarScroll.ts
│   ├── storage/
│   │   └── slipStorage.ts        # AsyncStorage CRUD + parlay odds math
│   └── utils/
│       ├── mlbImages.ts          # Team abbr map + stadium image URLs
│       ├── edgeScore.ts          # Prediction scoring algorithm
│       ├── predictions.ts
│       ├── formatters.ts
│       └── weatherimpact.ts
│
├── assets/                       # App icon, splash screen, fonts
├── app.json                      # Expo project configuration
├── eas.json                      # EAS Build profiles (create this — see below)
├── package.json
└── tsconfig.json
```

---

## Getting Started (Local Dev)

### Prerequisites

- Node.js 18+
- [Expo Go](https://apps.apple.com/app/expo-go/id982107779) on your iPhone for quick testing

### Install & Run

```bash
git clone https://github.com/visuxlive/MLBEdgePro.git
cd MLBEdgePro
npm install
npx expo start
```

Scan the QR code with your iPhone camera → opens in Expo Go.

> **Note:** The Liquid Glass tab bar requires iOS 26+. On earlier versions the app automatically falls back to a standard blur effect.

---

## Getting the App on Your iPhone — No Computer Required

After the initial setup below, all future builds and updates can be triggered from **any machine or from GitHub Actions** — you never need your local computer again.

### What you need

| Requirement | Cost | Link |
|---|---|---|
| Expo account | Free | [expo.dev/signup](https://expo.dev/signup) |
| Apple Developer account | $99/yr | [developer.apple.com](https://developer.apple.com) |
| EAS CLI (one-time local setup) | Free | `npm install -g eas-cli` |

---

### One-Time Local Setup

**1. Install EAS CLI and log in**

```bash
npm install -g eas-cli
eas login
```

**2. Initialize EAS for this project**

```bash
eas init
```

This adds a `extra.eas.projectId` to `app.json`. Commit that change.

**3. Create `eas.json` in the project root**

```json
{
  "cli": {
    "version": ">= 14.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

**4. Trigger a cloud build**

```bash
eas build --platform ios --profile preview
```

EAS builds the app on Expo's servers — no Xcode needed locally. Takes ~10–20 minutes.

---

### Installing on iPhone

**Option A — Direct install link (no TestFlight needed)**

When the build finishes, EAS gives you an install link. Open it in **Safari on your iPhone** → tap Install. Done.

> This requires the device UDID to be registered with your Apple Developer account. EAS handles this automatically when you run `eas device:create`.

```bash
eas device:create   # register your iPhone's UDID
eas build --platform ios --profile preview   # rebuild with device registered
```

**Option B — TestFlight**

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

Go to [App Store Connect](https://appstoreconnect.apple.com), add yourself as a TestFlight internal tester, and install via the TestFlight app on your iPhone.

---

### Future Updates — No Rebuild Required

JavaScript and UI changes can be pushed **over-the-air** using EAS Update. The app downloads the update automatically on next launch:

```bash
eas update --branch preview --message "New scores layout"
```

Only changes to native modules, `app.json`, or `package.json` dependencies require a full rebuild.

---

### Automating via GitHub Actions (fully hands-free)

Create `.github/workflows/eas-build.yml`:

```yaml
name: EAS Preview Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g eas-cli
      - run: npm ci
      - run: eas build --platform ios --profile preview --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

Add your `EXPO_TOKEN` (from [expo.dev/accounts/settings/access-tokens](https://expo.dev/accounts/settings/access-tokens)) as a GitHub secret. Every push to `main` triggers a new build automatically.

---

## Environment Variables

No API keys required. Both data sources are free and require no authentication:

| Service | Base URL | Auth |
|---|---|---|
| MLB Stats API | `https://statsapi.mlb.com/api/v1` | None |
| Open-Meteo | `https://api.open-meteo.com/v1` | None |

If you add paid services later, use a `.env.local` file (already in `.gitignore`):

```bash
EXPO_PUBLIC_SOME_KEY=your_value
```

Access in code via `process.env.EXPO_PUBLIC_SOME_KEY`.

---

## Roadmap

### In Progress 🔨
- [ ] EAS Build + TestFlight distribution
- [ ] Scores tab: inning-by-inning linescore box score
- [ ] Game detail: full box score

### Planned 📋
- [ ] Push notifications for bet slip check-in reminders
- [ ] Live activity / Dynamic Island for in-progress games
- [ ] Historical prop accuracy tracking per player
- [ ] Home run probability adjusted for ballpark + wind direction
- [ ] Odds comparison across sportsbooks
- [ ] Streak tracking per prop type
- [ ] iPad optimized layout
- [ ] GitHub Actions CI for automatic EAS builds on push

### Done ✅
- [x] Custom Liquid Glass tab bar (iOS 26+ native, blur fallback)
- [x] Today's games — featured team card, stadium photos, weather
- [x] Weather strip on every game card (icon, °F, wind arrows + speed)
- [x] Scores tab — horizontal scoreboards, 7-day date chips, R/H/E, pitcher matchups
- [x] Prop Builder — 2×2 grid, combined probability, implied break-even odds
- [x] Save Slip — AsyncStorage persistence, instant cross-tab state sync
- [x] Parlay payout odds (exact FanDuel math: `Math.floor((decimal_product - 1) × 100)`)
- [x] Bet history — open/won/lost, win rate stat, "$X to win $Y" at-a-glance cards
- [x] Per-leg FanDuel odds input with read-only prediction probability
- [x] Check-in banner on Today tab for completed pending slips
- [x] Deep analysis: pitcher stats, batter stats, head-to-head, edge score
- [x] Favorite team setting
- [x] Terms of Service + Privacy Policy v1.1

---

## License

MIT — see [LICENSE](./LICENSE) for full terms.

---

*MLBEdgePro is an independent project. Not affiliated with, endorsed by, or connected to Major League Baseball, any MLB team, or any sportsbook.*
