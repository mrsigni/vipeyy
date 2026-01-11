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
        throw new Error("Unauthorized: No admin session token found");
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("Server configuration error");
        }

        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(secret)
        );

        const adminId = payload.adminId as string;

        if (!adminId) {
            throw new Error("Invalid token: adminId not found in payload");
        }

        const admin = await prisma.admin.findUnique({ where: { id: adminId } });

        if (!admin) {
            throw new Error("Forbidden: Not an admin");
        }

        return adminId;
    } catch (error) {
        console.error("[Auth] Admin token verification failed:", error);
        throw new Error("Invalid or expired admin token");
    }
}
