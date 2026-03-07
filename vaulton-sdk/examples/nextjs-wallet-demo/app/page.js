"use client";

import { useMemo, useState } from "react";
import { createVaultonWalletSDK } from "vaulton-wallet-sdk";

export default function Page() {
    const sdk = useMemo(() => createVaultonWalletSDK(), []);

    const [session, setSession] = useState(() => sdk.getSession());
    const [recipient, setRecipient] = useState("");
    const [amountUsdc, setAmountUsdc] = useState("1.00");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);

    const run = async (label, fn) => {
        setLoading(true);
        setStatus(`${label}...`);
        try {
            const result = await fn();
            if (result?.userId) {
                setSession(result);
            } else if (label === "Logout") {
                setSession(null);
            }
            setStatus(`${label} successful.`);
        } catch (error) {
            setStatus(error?.message || `${label} failed.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
            <h1 style={{ marginBottom: 8 }}>Vaulton Wallet SDK Demo</h1>
            <p style={{ color: "#555", marginBottom: 20 }}>
                Passkey signup, login, session restore, and USDC transfer from a dApp frontend.
            </p>

            <section style={{ background: "#fff", border: "1px solid #e7e9ef", borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <h2 style={{ marginTop: 0 }}>Session</h2>
                <pre style={{ background: "#f4f6fb", padding: 12, borderRadius: 10, overflow: "auto" }}>
{JSON.stringify(session, null, 2)}
                </pre>
            </section>

            <section style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <button disabled={loading} onClick={() => run("Signup", () => sdk.signupAccount())}>Signup</button>
                <button disabled={loading} onClick={() => run("Login", () => sdk.loginAccount())}>Login</button>
                <button disabled={loading} onClick={() => run("Restore", async () => sdk.getSession())}>Restore Session</button>
                <button
                    disabled={loading}
                    onClick={() =>
                        run("Logout", async () => {
                            sdk.logoutAccount();
                            return null;
                        })
                    }
                >
                    Logout
                </button>
            </section>

            <section style={{ background: "#fff", border: "1px solid #e7e9ef", borderRadius: 14, padding: 16 }}>
                <h2 style={{ marginTop: 0 }}>Transfer USDC</h2>
                <div style={{ display: "grid", gap: 8 }}>
                    <input
                        value={recipient}
                        onChange={(event) => setRecipient(event.target.value)}
                        placeholder="Recipient smart account (G... or C...)"
                        style={{ padding: 10, borderRadius: 10, border: "1px solid #d8dbe5" }}
                    />
                    <input
                        value={amountUsdc}
                        onChange={(event) => setAmountUsdc(event.target.value)}
                        placeholder="Amount in USDC"
                        style={{ padding: 10, borderRadius: 10, border: "1px solid #d8dbe5" }}
                    />
                    <button
                        disabled={loading}
                        onClick={() =>
                            run("Transfer", () =>
                                sdk.transferUsdc({
                                    recipient,
                                    amountUsdc,
                                })
                            )
                        }
                    >
                        Transfer
                    </button>
                </div>
            </section>

            <p style={{ marginTop: 16, color: "#333" }}>{status}</p>
        </main>
    );
}
