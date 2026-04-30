# Next.js Demo (`vaulton-wallet-sdk`)

## Run

```bash
cd vaulton-sdk/examples/nextjs-wallet-demo
npm install
npm run dev
```

Open `http://localhost:3000`.

## What it shows

- Passkey signup
- Passkey login
- Session restore/logout
- Wallet balance lookup
- USDC transfer

## Integration Notes

- The SDK is browser-only for passkey flows, so the demo uses client components.
- Session state is stored locally and can be restored after a refresh.
- Transfers require an active session and a valid Stellar recipient address.
