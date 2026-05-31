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
