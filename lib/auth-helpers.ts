import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "./prisma";

export async function getUserIdFromCookie(): Promise<string> {
    const cookieStore = await cookies();
    const token = cookieStore.get("vipeysession")?.value;

    if (!token) {
        console.error("[Auth] No session token found in cookies");
        throw new Error("Unauthorized: No session token found");
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("[Auth] JWT_SECRET not configured");
            throw new Error("Server configuration error");
        }

        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(secret)
        );

        console.log("[Auth] JWT payload:", JSON.stringify(payload));

        const userId = payload.userId as string;

        if (!userId) {
            console.error("[Auth] userId not found in JWT payload");
            throw new Error("Invalid token: userId not found in payload");
        }

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true }
        });

        if (!user) {
            console.error("[Auth] User not found in database:", userId);
            throw new Error("User not found");
        }

        console.log("[Auth] Successfully authenticated userId:", userId);
        return userId;
    } catch (error) {
        console.error("[Auth] Token verification failed:", error);
        throw new Error("Invalid or expired token");
    }
}

export async function getAdminIdFromCookie(): Promise<string> {
    const cookieStore = await cookies();
    const token = cookieStore.get("vipeyadminsession")?.value;

    if (!token) {
        console.error("[Auth] No admin session token found");
        throw new Error("Unauthorized: No admin session token found");
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("[Auth] JWT_SECRET not configured");
            throw new Error("Server configuration error");
        }

        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(secret)
        );

        console.log("[Auth] Admin JWT payload:", JSON.stringify(payload));

        const adminId = payload.adminId as string;
        const sessionToken = payload.sessionToken as string;

        if (!adminId) {
            console.error("[Auth] adminId not found in JWT payload");
            throw new Error("Invalid token: adminId not found in payload");
        }

        // Verify session exists and is valid
        const session = await prisma.adminSession.findUnique({
            where: { sessionToken },
            include: { admin: true }
        });

        if (!session) {
            console.error("[Auth] Admin session not found in database");
            throw new Error("Session not found");
        }

        if (session.expires < new Date()) {
            console.error("[Auth] Admin session expired");
            await prisma.adminSession.delete({ where: { sessionToken } }).catch(() => {});
            throw new Error("Session expired");
        }

        console.log("[Auth] Successfully authenticated adminId:", adminId);
        return adminId;
    } catch (error) {
        console.error("[Auth] Admin token verification failed:", error);
        throw new Error("Invalid or expired admin token");
    }
}
