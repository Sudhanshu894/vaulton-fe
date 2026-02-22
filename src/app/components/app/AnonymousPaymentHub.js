"use client";

import SendScreen from "./SendScreen";

export default function AnonymousPaymentHub({ onBack, user, balance }) {
    return (
        <SendScreen
            onBack={onBack}
            user={user}
            balance={balance}
            forceAnonymousMode
            showRecipientSuggestions={false}
            title="Anonymous Pay"
            cancelLabel="Back"
        />
    );
}
