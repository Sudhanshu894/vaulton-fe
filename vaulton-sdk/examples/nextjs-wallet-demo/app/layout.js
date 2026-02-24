export const metadata = {
    title: "Vaulton Wallet SDK Demo",
    description: "Demo integration for vaulton-wallet-sdk",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f7f8fc" }}>
                {children}
            </body>
        </html>
    );
}
