# vaulton-wallet-sdk

Passkey wallet SDK for Vaulton.  
Use it in any frontend dApp to:

- Sign up (passkey registration + smart account deploy)
- Login (passkey auth)
- Persist/restore/logout wallet session
- Read account details and USDC balance
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
// or:
// const sdk = createVaultonWalletSDK({ backendUrl: "https://vaulton.dahiya.tech" });
```

## Client-Side Use

Passkey methods must run in the browser.

```js
"use client";
```

Use the SDK from client components or browser-only scripts. The following flow covers the most common integration path:

```js
const sdk = createVaultonWalletSDK();

const session = sdk.getSession();
if (!session) {
  await sdk.signupAccount();
} else if (!sdk.isLoggedIn()) {
  await sdk.loginAccount();
}

const balance = await sdk.getUsdcBalance();
console.log(balance);
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

### `restoreSession()`

Returns the stored local session without making a network request.

```js
const session = sdk.restoreSession();
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

### `isLoggedIn()`

Returns `true` when the SDK has a stored user and smart account session.

```js
const loggedIn = sdk.isLoggedIn();
```

### `getAccountInfo(userId?)`

Fetches the backend user profile. If `userId` is omitted, the SDK uses the active session.

```js
const account = await sdk.getAccountInfo();
```

### `getUsdcBalance(childId?)`

Fetches the current USDC balance for the active smart account. If `childId` is omitted, the SDK uses the active session.

```js
const balance = await sdk.getUsdcBalance();
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

It demonstrates:

- Passkey signup
- Passkey login
- Session restore
- USDC balance lookup
- USDC transfer

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

If this returns `E404`, that is expected before first publish and means the name is available.

Optional cleaner check (without treating E404 as failure in your shell script):

```bash
npm view vaulton-wallet-sdk version >/dev/null 2>&1 && echo "Name is taken" || echo "Name is available"
```

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
  - `/get-usdc-balance`
  - `/transfer-usdc`
