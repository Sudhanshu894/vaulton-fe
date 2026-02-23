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
    const socketRef = useRef(null);
    const isDisplayingRef = useRef(false);

    useEffect(() => {
        // Initialize socket connection
        const socket = io(backendUrl, {
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            if (creatorAddress) {
                socket.emit('join-creator-room', { creatorAddress });
            }
        });

        socket.on('superchat', (data) => {
            setQueue(prev => [...prev, data]);
        });

        socket.on('superchat-queue', (pendingQueue) => {
            if (Array.isArray(pendingQueue)) {
                setQueue(prev => [...prev, ...pendingQueue]);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [creatorAddress, backendUrl]);

    useEffect(() => {
        // Process queue whenever it changes or a display finishes
        if (!isDisplayingRef.current && queue.length > 0 && !currentDonation) {
            isDisplayingRef.current = true;

            const nextDonation = queue[0];
            setCurrentDonation(nextDonation);
            setQueue(prev => prev.slice(1));

            const duration = nextDonation.duration || 5000;

            // Set timeout to hide donation
            setTimeout(() => {
                setCurrentDonation(null);

                // Set timeout for exit animation before starting next
                setTimeout(() => {
                    if (nextDonation.donationId && socketRef.current) {
                        socketRef.current.emit('superchat-displayed', { donationId: nextDonation.donationId });
                    }
                    isDisplayingRef.current = false;
                    // React state update will trigger next effect run
                }, 500); // 500ms for exit animation
            }, duration);
        }
    }, [queue, currentDonation]);

    // Don't render layout elements, just the overlay
    return (
        <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-end pb-10 bg-transparent font-['Poppins',sans-serif]">
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
