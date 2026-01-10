"use client";

import { useEffect, useRef, useCallback } from "react";

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
    const onVerifyRef = useRef(onVerify);
    const isRenderedRef = useRef(false);

    // Update the ref when onVerify changes, but don't trigger re-render
    useEffect(() => {
        onVerifyRef.current = onVerify;
    }, [onVerify]);

    const renderTurnstile = useCallback(() => {
        if (!window.turnstile || !containerRef.current || isRenderedRef.current) return;

        // Clear any existing widget first
        if (widgetIdRef.current) {
            try {
                window.turnstile.remove(widgetIdRef.current);
            } catch (e) {
                // Ignore error if widget already removed
            }
            widgetIdRef.current = null;
        }

        isRenderedRef.current = true;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
                onVerifyRef.current(token);
            },
            theme: "light",
        });
    }, [siteKey]);

    useEffect(() => {
        if (!containerRef.current || !siteKey) return;

        // Reset render state on mount
        isRenderedRef.current = false;

        if (window.turnstile) {
            renderTurnstile();
        } else {
            window.onloadTurnstileCallback = renderTurnstile;
        }

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch (e) {
                    // Ignore error if widget already removed
                }
                widgetIdRef.current = null;
            }
            isRenderedRef.current = false;
        };
    }, [siteKey, renderTurnstile]);

    return <div ref={containerRef} />;
}
