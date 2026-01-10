"use client";

import { useEffect, useRef, useState } from "react";

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
            reset: (widgetId?: string) => void;
        };
        onloadTurnstileCallback?: () => void;
    }
}

export default function Turnstile({ onVerify, siteKey }: TurnstileProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const isRenderingRef = useRef(false);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);

    useEffect(() => {
        const checkScriptLoaded = () => {
            if (typeof window !== 'undefined' && window.turnstile) {
                setIsScriptLoaded(true);
                return true;
            }
            return false;
        };

        if (checkScriptLoaded()) return;

        const interval = setInterval(() => {
            if (checkScriptLoaded()) {
                clearInterval(interval);
            }
        }, 100);

        const timeout = setTimeout(() => {
            clearInterval(interval);
        }, 10000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, []);

    useEffect(() => {
        if (!containerRef.current || !siteKey || !isScriptLoaded || isRenderingRef.current) return;

        const renderTurnstile = () => {
            if (!window.turnstile || !containerRef.current || isRenderingRef.current) return;

            if (widgetIdRef.current) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch (e) {
                    // Widget might not exist anymore
                }
                widgetIdRef.current = null;
            }

            isRenderingRef.current = true;

            try {
                widgetIdRef.current = window.turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    callback: (token: string) => {
                        onVerify(token);
                    },
                    theme: "light",
                    size: "normal",
                });
            } catch (error) {
                console.error("Failed to render Turnstile:", error);
            } finally {
                isRenderingRef.current = false;
            }
        };

        const timeoutId = setTimeout(renderTurnstile, 100);

        return () => {
            clearTimeout(timeoutId);
            if (widgetIdRef.current && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch (e) {
                    // Ignore removal errors
                }
                widgetIdRef.current = null;
            }
        };
    }, [siteKey, onVerify, isScriptLoaded]);

    return <div ref={containerRef} className="flex justify-center" />;
}