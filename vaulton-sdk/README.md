# vaulton-wallet-sdk

Passkey wallet SDK for Vaulton.  
Use it in any frontend dApp to:

- Sign up (passkey registration + smart account deploy)
- Login (passkey auth)
- Persist/restore/logout wallet session
- Transfer USDC

Default backend used by SDK: `https://vaulton-testnet.dahiya.tech`

## Install

```bash
npm install vaulton-wallet-sdk
```

## Quick Start

```js
import { createVaultonWalletSDK } from "vaulton-wallet-sdk";

const sdk = createVaultonWalletSDK();

// Optional backend override:
// const sdk = createVaultonWalletSDK({ baseURL: "https://vaulton.dahiya.tech" });
```

## API

### `signupAccount()`

Creates wallet account using passkey and stores session locally.

```js
const session = await sdk.signupAccount();
console.log(session.userId, session.smartAccountId);
```

### `loginAccount()`

Authenticates existing user with passkey and stores session locally.

```js
const session = await sdk.loginAccount();
```

### `logoutAccount()`

Clears SDK local session.

```js
sdk.logoutAccount();
```

### `getSession()`

Returns stored session object or `null`.

```js
const session = sdk.getSession();
```

### `transferUsdc({ recipient, amountUsdc })`

Signs and submits USDC transfer.

```js
await sdk.transferUsdc({
  recipient: "C...RECIPIENT_ADDRESS",
  amountUsdc: "1.25",
});
```

### Aliases

- `createAccount()` -> `signupAccount()`
- `sendUsdc()` -> `transferUsdc()`

## Next.js Usage

Passkey calls must run on the client side:

```js
"use client";
```

Use SDK methods inside client components only.

## Local Session Shape

```ts
type VaultonSession = {
  userId: string;
  smartAccountId: string;
  passkeyPubkey: string;
  publicKeyHex: string;
  name: string;
  createdAt: string;
  credentialId: string;
};
```

## Local Example App

A working sample app is included here:

`vaulton-sdk/examples/nextjs-wallet-demo`

## Publish To npm (Your Profile)

Run these commands from `vaulton-sdk`:

```bash
cd vaulton-sdk
npm login
npm whoami
```

1. Check package name availability:

```bash
npm view vaulton-wallet-sdk name
```

If this returns `404`, name is available.

2. Dry run publish package:

```bash
npm pack --dry-run
```

3. Publish first version:

```bash
npm publish --access public
```

4. For updates:

```bash
npm version patch
npm publish --access public
```

## Notes

- Browser-only for passkey methods.
- Requires backend endpoints already used by Vaulton frontend:
  - `/register-challenge`
  - `/register-verify`
  - `/login-challenge`
  - `/login-verify`
  - `/user-info`
  - `/deploy-child`
  - `/get-nonce`
  - `/transfer-usdc`
