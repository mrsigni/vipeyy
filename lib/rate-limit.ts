import { NextRequest } from "next/server";

type RateLimitStore = {
    requests: number[];
    lastCleanup: number;
};

const store = new Map<string, RateLimitStore>();

const CLEANUP_INTERVAL = 60 * 60 * 1000;

function cleanupOldEntries() {
    const now = Date.now();
    for (const [key, value] of store.entries()) {
        if (now - value.lastCleanup > CLEANUP_INTERVAL) {
            store.delete(key);
        }
    }
}

export function rateLimit(options: {
    interval: number;
    uniqueTokenPerInterval: number;
}) {
    return {
        check: (request: NextRequest, limit: number, token: string) => {
            const now = Date.now();
            const tokenKey = `${token}`;

            if (!store.has(tokenKey)) {
                store.set(tokenKey, {
                    requests: [now],
                    lastCleanup: now,
                });
                return { success: true, remaining: limit - 1, reset: now + options.interval, retryAfter: 0 };
            }

            const tokenStore = store.get(tokenKey)!;
            const windowStart = now - options.interval;

            tokenStore.requests = tokenStore.requests.filter((time) => time > windowStart);

            if (tokenStore.requests.length >= limit) {
                const oldestRequest = Math.min(...tokenStore.requests);
                const resetTime = oldestRequest + options.interval;
                return {
                    success: false,
                    remaining: 0,
                    reset: resetTime,
                    retryAfter: Math.ceil((resetTime - now) / 1000)
                };
            }

            tokenStore.requests.push(now);
            tokenStore.lastCleanup = now;

            if (Math.random() < 0.01) {
                cleanupOldEntries();
            }

            return {
                success: true,
                remaining: limit - tokenStore.requests.length,
                reset: now + options.interval,
                retryAfter: 0
            };
        },
    };
}

export function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");

    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }

    if (realIp) {
        return realIp;
    }

    return "unknown";
}
