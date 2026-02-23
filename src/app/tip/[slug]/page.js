import { redirect } from "next/navigation";

const normalize = (value) => String(value || "").trim();
const isLikelyStellarAddress = (value) => /^[GC][A-Z2-7]{20,}$/.test(String(value || ""));

export default async function TipLinkRedirectPage({ params, searchParams }) {
    const resolvedParams = await Promise.resolve(params);
    const resolvedSearch = await Promise.resolve(searchParams);
    const slugValue = normalize(resolvedParams?.slug);
    const slugAsAddress = slugValue.toUpperCase();

    const recipient = normalize(
        resolvedSearch?.recipient ||
        resolvedSearch?.destination ||
        resolvedSearch?.address ||
        (isLikelyStellarAddress(slugAsAddress) ? slugAsAddress : "")
    );
    const amount = normalize(resolvedSearch?.amount);
    const minAmount = normalize(
        resolvedSearch?.minAmount ||
        resolvedSearch?.minimumAmount ||
        resolvedSearch?.tipMin ||
        resolvedSearch?.tipMinimum
    );
    const creatorName = normalize(
        resolvedSearch?.creatorName ||
        resolvedSearch?.creator ||
        slugValue.replace(/-/g, " ")
    );
    const creatorUserId = normalize(
        resolvedSearch?.creatorUserId ||
        resolvedSearch?.creatorId
    );
    const message = normalize(
        resolvedSearch?.message ||
        resolvedSearch?.tipMessage
    );

    if (!recipient) {
        return (
            <main className="min-h-screen bg-[#F8F9FB] text-[#1A1A2E] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white border border-gray-100 rounded-3xl p-6 text-center space-y-2">
                    <h1 className="text-xl font-black">Invalid Tip Link</h1>
                    <p className="text-sm text-gray-500 font-semibold">
                        This tip link is missing a creator wallet address.
                    </p>
                </div>
            </main>
        );
    }

    const nextParams = new URLSearchParams();
    nextParams.set("tab", "send");
    nextParams.set("source", "tip_link");
    nextParams.set("tip", "1");
    nextParams.set("recipient", recipient);

    if (amount) {
        nextParams.set("amount", amount);
    } else if (minAmount) {
        nextParams.set("amount", minAmount);
    }
    if (minAmount) nextParams.set("minAmount", minAmount);
    if (creatorName) nextParams.set("creatorName", creatorName);
    if (creatorUserId) nextParams.set("creatorUserId", creatorUserId);
    if (message) nextParams.set("message", message);

    redirect(`/dashboard?${nextParams.toString()}`);
}
