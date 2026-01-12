import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "./prisma";

export async function getUserIdFromCookie(): Promise<string> {
    const cookieStore = await cookies();
    const token = cookieStore.get("vipeysession")?.value;

    if (!token) {
        throw new Error("Unauthorized: No session token found");
    }

    try {
        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(process.env.JWT_SECRET!)
        );

        const userId = payload.userId as string;

        if (!userId) {
            throw new Error("Invalid token: userId not found in payload");
        }

        return userId;
    } catch (error) {
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
        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(process.env.JWT_SECRET!)
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
        throw new Error("Invalid or expired admin token");
    }
}
