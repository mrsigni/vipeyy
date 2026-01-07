import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Token is required" },
                { status: 400 }
            );
        }

        const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

        if (!secretKey) {
            console.error("CLOUDFLARE_TURNSTILE_SECRET_KEY is not configured");
            return NextResponse.json(
                { success: false, error: "Server configuration error" },
                { status: 500 }
            );
        }

        const verifyEndpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

        const verifyResponse = await fetch(verifyEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                secret: secretKey,
                response: token,
            }),
        });

        const verifyData = await verifyResponse.json();

        if (verifyData.success) {
            return NextResponse.json({
                success: true,
                message: "Verification successful",
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error: "Verification failed",
                    details: verifyData["error-codes"] || [],
                },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Turnstile verification error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
