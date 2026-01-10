"use client";

import { useEffect, useRef } from "react";

interface TurnstileProps {
    onVerify: (token: string) => void;
    siteKey: string;
}

declare global {
    interface Window {
        turnstile?: {
            render: (
                container: string | HTMLElement,
                options: {
                    sitekey: string;
                    callback: (token: string) => void;
                    theme?: "light" | "dark";
                    size?: "normal" | "invisible" | "compact";
                    appearance?: "always" | "execute" | "interaction-only";
                }
            ) => string;
            execute: (container?: string | HTMLElement, options?: { action?: string }) => void;
            remove: (widgetId: string) => void;
        };
        onloadTurnstileCallback?: () => void;
    }
}

export default function Turnstile({ onVerify, siteKey }: TurnstileProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!containerRef.current || !siteKey) return;

        const renderTurnstile = () => {
            if (!window.turnstile || !containerRef.current) return;

            widgetIdRef.current = window.turnstile.render(containerRef.current, {
                sitekey: siteKey,
                callback: (token: string) => {
                    onVerify(token);
                },
                theme: "light",
            });
        };

        if (window.turnstile) {
            renderTurnstile();
        } else {
            window.onloadTurnstileCallback = renderTurnstile;
        }

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
            }
        };
    }, [siteKey, onVerify]);

    return <div ref={containerRef} />;
}