"use client";

import Link from "next/link";

const installSnippet = `npm install vaulton-wallet-sdk`;

const initSnippet = `import { createVaultonWalletSDK } from "vaulton-wallet-sdk";

const sdk = createVaultonWalletSDK();
// Optional override
// const sdk = createVaultonWalletSDK({ baseURL: "https://vaulton.dahiya.tech" });`;

const flowSnippet = `await sdk.signupAccount();     // passkey register + account bootstrap
await sdk.loginAccount();      // passkey login

await sdk.transferUsdc({
  recipient: "C...RECIPIENT_ADDRESS",
  amountUsdc: "1.25",
});

sdk.logoutAccount();`;

const methods = [
  { name: "signupAccount()", desc: "Registers with passkey and creates/loads the smart account session." },
  { name: "loginAccount()", desc: "Authenticates with passkey and restores active wallet session." },
  { name: "logoutAccount()", desc: "Clears local SDK session for the current user." },
  { name: "transferUsdc({ recipient, amountUsdc })", desc: "Signs with passkey and submits USDC transfer." },
  { name: "getUsdcBalance()", desc: "Returns latest USDC balance for current session wallet." },
  { name: "getAccountInfo(userId?)", desc: "Fetches backend profile info for a user." },
  { name: "getSession()", desc: "Returns local session payload (`userId`, `smartAccountId`, etc.)." },
  { name: "isLoggedIn()", desc: "True if SDK has an active stored session." },
];

export default function SdkDocsPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1A1A2E] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Vaulton Wallet SDK Docs</h1>
          <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-[#1A1A2E] text-white text-xs font-bold uppercase tracking-wide">
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 md:p-8 shadow-sm space-y-3">
          <p className="text-sm md:text-base text-gray-600 font-semibold">
            Integrate passkey wallet auth and USDC payments into any frontend.
          </p>
          <p className="text-xs md:text-sm text-gray-500">
            Default backend URL used by SDK: <span className="font-mono text-[#1A1A2E]">https://vaulton-testnet.dahiya.tech</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-gray-100 rounded-3xl p-5 md:p-8 shadow-sm space-y-3">
            <h2 className="text-base md:text-lg font-black">1. Install</h2>
            <pre className="bg-[#1A1A2E] text-emerald-300 text-xs md:text-sm rounded-2xl p-4 overflow-x-auto">
              <code>{installSnippet}</code>
            </pre>
          </section>

          <section className="bg-white border border-gray-100 rounded-3xl p-5 md:p-8 shadow-sm space-y-3">
            <h2 className="text-base md:text-lg font-black">2. Initialize</h2>
            <pre className="bg-[#1A1A2E] text-emerald-300 text-xs md:text-sm rounded-2xl p-4 overflow-x-auto">
              <code>{initSnippet}</code>
            </pre>
          </section>
        </div>

        <section className="bg-white border border-gray-100 rounded-3xl p-5 md:p-8 shadow-sm space-y-3">
          <h2 className="text-base md:text-lg font-black">3. Core Flow</h2>
          <pre className="bg-[#1A1A2E] text-emerald-300 text-xs md:text-sm rounded-2xl p-4 overflow-x-auto">
            <code>{flowSnippet}</code>
          </pre>
        </section>

        <section className="bg-white border border-gray-100 rounded-3xl p-5 md:p-8 shadow-sm space-y-4">
          <h2 className="text-base md:text-lg font-black">API Methods</h2>
          <div className="space-y-3">
            {methods.map((method) => (
              <div key={method.name} className="rounded-2xl border border-gray-100 p-4 bg-[#FCFCFD]">
                <p className="font-mono text-xs md:text-sm font-bold text-[#1A1A2E]">{method.name}</p>
                <p className="text-xs md:text-sm text-gray-600 mt-1">{method.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-100 rounded-3xl p-5 md:p-8 shadow-sm space-y-2">
          <h2 className="text-base md:text-lg font-black">Example Project</h2>
          <p className="text-xs md:text-sm text-gray-600">
            A complete Next.js integration example is included in:
          </p>
          <p className="font-mono text-xs md:text-sm bg-[#F8F9FB] p-3 rounded-xl border border-gray-100">
            vaulton-sdk/examples/nextjs-wallet-demo
          </p>
        </section>
      </div>
    </div>
  );
}
