"use client";

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { BACKEND_API_URL } from '@/services/backendservices';

function formatAmount(stroops, symbol) {
    let stroopsValue = 0;
    try {
        stroopsValue = Number(BigInt(String(stroops ?? 0)));
    } catch {
        stroopsValue = Number(stroops) || 0;
    }
    const val = stroopsValue / 1e7;
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (symbol || "USDC");
}

function OverlayContent() {
    const searchParams = useSearchParams();
    const creatorAddress = searchParams.get('address');
    const customServer = searchParams.get('server');

    const backendUrl = customServer || BACKEND_API_URL;

    const [queue, setQueue] = useState([]);
    const [currentDonation, setCurrentDonation] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState({
        state: "connecting",
        title: "Connecting to creator room",
        detail: "Waiting for a valid creator address.",
    });
    const socketRef = useRef(null);
    const isDisplayingRef = useRef(false);

    useEffect(() => {
        if (!creatorAddress) {
            return undefined;
        }

        const statusTimer = window.setTimeout(() => {
            setConnectionStatus({
                state: "connecting",
                title: "Connecting to creator room",
                detail: "Joining the live SuperChat feed.",
            });
        }, 0);

        const socket = io(backendUrl, {
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join-creator-room', { creatorAddress });
            setConnectionStatus({
                state: "connected",
                title: "Connected",
                detail: `Listening for SuperChats for ${creatorAddress.slice(0, 8)}...`,
            });
        });

        socket.on('superchat', (data) => {
            setQueue(prev => [...prev, data]);
        });

        socket.on('superchat-queue', (pendingQueue) => {
            if (Array.isArray(pendingQueue)) {
                setQueue(prev => [...prev, ...pendingQueue]);
            }
        });

        socket.on('disconnect', () => {
            setConnectionStatus({
                state: "disconnected",
                title: "Disconnected",
                detail: "Waiting to reconnect to the live SuperChat feed.",
            });
        });

        socket.on('connect_error', (error) => {
            setConnectionStatus({
                state: "error",
                title: "Connection failed",
                detail: error?.message || "Unable to reach the overlay backend.",
            });
        });

        return () => {
            window.clearTimeout(statusTimer);
            socket.disconnect();
        };
    }, [creatorAddress, backendUrl]);

    useEffect(() => {
        // Process queue whenever it changes or a display finishes
        if (!isDisplayingRef.current && queue.length > 0 && !currentDonation) {
            const nextDonation = queue[0];
            const timerId = window.setTimeout(() => {
                if (isDisplayingRef.current) return;
                isDisplayingRef.current = true;

                setCurrentDonation(nextDonation);
                setQueue(prev => prev.slice(1));

                const duration = nextDonation.duration || 5000;

                // Set timeout to hide donation
                window.setTimeout(() => {
                    setCurrentDonation(null);

                    // Set timeout for exit animation before starting next
                    window.setTimeout(() => {
                        if (nextDonation.donationId && socketRef.current) {
                            socketRef.current.emit('superchat-displayed', { donationId: nextDonation.donationId });
                        }
                        isDisplayingRef.current = false;
                        // React state update will trigger next effect run
                    }, 500); // 500ms for exit animation
                }, duration);
            }, 0);

            return () => window.clearTimeout(timerId);
        }
    }, [queue, currentDonation]);

    const queueEmpty = queue.length === 0 && !currentDonation;
    const roomReady = Boolean(creatorAddress) && connectionStatus.state === "connected";
    const overlayStatus = creatorAddress
        ? connectionStatus
        : {
            state: "missing-address",
            title: "Overlay not configured",
            detail: "Open this overlay with a creator wallet address, or launch it from the streaming dashboard.",
        };

    // Don't render layout elements, just the overlay
    return (
        <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-end pb-10 bg-transparent font-['Poppins',sans-serif]">
            {queueEmpty && (!creatorAddress || !roomReady) && (
                <div className="absolute inset-0 flex items-center justify-center px-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="max-w-lg w-full p-6 rounded-3xl bg-[#0f0f1e]/85 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-white text-center"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 text-white/80">
                            <span className={`w-2 h-2 rounded-full ${overlayStatus.state === "connected" ? "bg-emerald-400" : overlayStatus.state === "missing-address" ? "bg-amber-400" : "bg-blue-400"}`} />
                            <span>{overlayStatus.title}</span>
                        </div>
                        <h2 className="mt-4 text-2xl font-black text-white">{overlayStatus.title}</h2>
                        <p className="mt-2 text-sm text-white/75 leading-relaxed">
                            {overlayStatus.detail}
                        </p>
                        {!creatorAddress ? (
                            <div className="mt-4 text-left text-xs text-white/70 space-y-2">
                                <p className="font-bold text-white/90">Testing OBS?</p>
                                <p>1. Open the Streaming Partnership dashboard.</p>
                                <p>2. Copy the overlay link from the Streaming Overlay section.</p>
                                <p>3. Paste it into an OBS Browser source.</p>
                            </div>
                        ) : (
                            <p className="mt-4 text-xs text-white/60">
                                The overlay will stay transparent until a SuperChat arrives.
                            </p>
                        )}
                    </motion.div>
                </div>
            )}

            {queueEmpty && roomReady && (
                <div className="absolute left-4 top-4 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="px-4 py-3 rounded-2xl bg-[#0f0f1e]/75 backdrop-blur-md border border-white/10 shadow-lg text-white"
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/80">{overlayStatus.title}</p>
                                <p className="text-[11px] text-white/60">Waiting for SuperChats.</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            <AnimatePresence>
                {currentDonation && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="w-[500px] p-6 rounded-2xl bg-[#0f0f1e]/90 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(99,102,241,0.15)] text-white"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-base text-[#c4b5fd]">
                                {currentDonation.senderName}
                            </span>
                            <span className="font-bold text-lg bg-gradient-to-br from-[#6366f1] to-[#a78bfa] text-transparent bg-clip-text">
                                {formatAmount(currentDonation.amount, currentDonation.tokenSymbol)}
                            </span>
                        </div>
                        {currentDonation.message && currentDonation.message.trim() && (
                            <div className="text-sm text-white/85 leading-relaxed break-words">
                                {currentDonation.message}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function OverlayPage() {
    return (
        <Suspense fallback={null}>
            <OverlayContent />
        </Suspense>
    );
}
