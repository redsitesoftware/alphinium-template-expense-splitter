[![Forge with Alphinium](https://img.shields.io/badge/🔨_Forge_with_Alphinium-Build_Your_Version-6366f1?style=for-the-badge&logo=github)](https://alphinium.com/forge?template=expense-splitter)

> **This is an Alphinium template.** Click the badge above to fork this project and have an AI agent build your customised version automatically.

---

# SplitEasy

SplitEasy is an Expo React Native demo for shared expense tracking and instant settlement flows.

## Highlights
- Pre-seeded groups with computed balances and who-owes-who settlements
- 3-step add expense flow with equal, amount, and percentage splits
- Finn payments assistant widget with ChatInstance-style quick actions
- alphinium-payments settlement callouts for Stripe, cash, and bank transfer flows

## Run locally
```bash
npm install --legacy-peer-deps
npx expo install react-dom react-native-web @expo/metro-runtime
CI=1 npx expo start --web --port 8100 --clear
```

## Configuration

| Variable | Description | Default | Notes |
|---|---|---|---|
| `EXPO_PUBLIC_GA_ID` | GA4 Measurement ID | `G-X09N3J8X17` | Override with your own GA property when going live |

Copy `.env.example` to `.env` and set your own values as needed.
