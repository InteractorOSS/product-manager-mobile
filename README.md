# Build — Mobile

iOS and Android companion app for [Build](https://build.interactor.com), the Interactor project management platform. Built with React Native + Expo.

## What it does

A native companion for the highest-value PM actions that happen on the go:

| Tab | What you can do |
|---|---|
| **Home** | Dashboard — project health at a glance |
| **Tasks** | View and update your assigned tasks |
| **Approvals** | Approve or reject deliverables and phases |
| **Inbox** | Notification feed, mark-read |
| **Me** | Your account, sign out |

Push notifications + live SSE updates keep every screen current without manual refresh.

## Requirements

- Node.js 22+
- npm 10+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- iOS: Xcode 15+ (for simulator) or the [Expo Go](https://expo.dev/go) app on a physical device
- Android: Android Studio with an emulator, or the [Expo Go](https://expo.dev/go) app on a physical device

## Running locally

```bash
# 1. Install dependencies
npm install

# 2. Copy env (defaults point to production API — change for local dev)
cp .env.example .env.local

# 3. Start the dev server
npm start
```

Expo will print a QR code. Scan it with the Expo Go app (iOS or Android) to open the app on your device, or press `i` for iOS simulator / `a` for Android emulator.

### Local dev against a local Build API

Edit `.env.local`:

```
EXPO_PUBLIC_API_URL=http://<your-machine-ip>:4025
EXPO_PUBLIC_ACCOUNT_SERVER_URL=https://auth.interactor.com
```

Use your machine's LAN IP (not `localhost`) — the device/emulator can't reach `localhost` on your laptop.

## Other commands

```bash
npm run typecheck   # TypeScript check (no emit)
npm run lint        # ESLint
npm run ios         # Open iOS simulator directly
npm run android     # Open Android emulator directly
```

## Project structure

```
app/
├── _layout.tsx          # Root layout: QueryClientProvider, AuthGuard, push + SSE wiring
├── (auth)/
│   └── login.tsx        # Login screen
└── (tabs)/
    ├── _layout.tsx      # Bottom tab bar
    ├── index.tsx        # Home / Dashboard
    ├── tasks.tsx        # My Tasks
    ├── approvals.tsx    # Approvals
    ├── inbox.tsx        # Inbox
    └── me.tsx           # Me / sign out

src/
├── lib/
│   ├── api-client.ts    # Typed fetch wrapper (Bearer pm_mobile_* token)
│   ├── config.ts        # EXPO_PUBLIC_* env vars
│   ├── push.ts          # Push notification registration
│   ├── queries.ts       # TanStack Query hooks
│   └── sse.ts           # SSE foreground hook (notifications:<userId>)
└── store/
    └── auth.ts          # Zustand auth store + SecureStore persistence
```

## Auth flow

1. User enters email + password on the login screen
2. Credentials are sent to the Interactor account server (`https://auth.interactor.com`) → returns a short-lived user JWT
3. The JWT is exchanged with the Build API (`POST /api/v1/me/mobile-sessions`) for a long-lived `pm_mobile_*` device token
4. The token is stored in the device Keychain (iOS) / Keystore (Android) via `expo-secure-store`
5. All subsequent API calls use `Authorization: Bearer pm_mobile_*`

Sign out revokes the session on the server and wipes the local token.

## Builds (EAS)

This app uses [EAS Build](https://docs.expo.dev/build/introduction/) for cloud builds.

| Profile | Distribution | Use for |
|---|---|---|
| `development` | Internal | Dev client builds |
| `preview` | Internal | QA / internal testing (sideload APK, TestFlight internal) |
| `production` | App Store / Play Store | Public release |

```bash
# Trigger a preview build (iOS + Android)
npx eas-cli build --platform all --profile preview

# Trigger a production build
npx eas-cli build --platform all --profile production
```

CI triggers a preview build automatically on every pull request.

### First-time EAS setup

1. Install EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login` (use `peter@interactor.com`)
3. iOS credentials: `eas credentials --platform ios` (requires a paid Apple Developer account)
4. Android credentials are managed automatically by EAS

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `https://build.interactor.com` | Build API base URL |
| `EXPO_PUBLIC_ACCOUNT_SERVER_URL` | `https://auth.interactor.com` | Interactor auth server |

CI/EAS also requires `EXPO_ACCESS_TOKEN` (set in GitHub Actions secrets, never committed).

## Contributing

Every change requires a GitHub issue, a dedicated branch, and a PR — no direct pushes to `main`. See [CLAUDE.md](./CLAUDE.md) for the full gate.

## License

AGPL-3.0 — see [LICENSE](./LICENSE).
