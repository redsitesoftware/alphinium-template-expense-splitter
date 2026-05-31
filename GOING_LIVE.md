# SplitEasy going live checklist

## Product setup
- Replace demo seeded groups with authenticated user data.
- Connect Finn to a real ChatInstance inbox and conversation history.
- Swap simulated reminders for push, email, or SMS delivery.

## Payments
- Wire alphinium-payments to live Stripe settlement intents.
- Add bank transfer rails for PayID/BSB and payout reconciliation.
- Persist payment request status, partial payments, and settlement receipts.

## Engineering
- Add API-backed group sync, user accounts, and durable expense storage.
- Capture analytics around reminders, conversion to payment, and repayment speed.
- Add QA coverage for custom split validation and settlement edge cases.
