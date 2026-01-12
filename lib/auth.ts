import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

type JwtPayload = {
  userId?: string;
  id?: string;
  email?: string;
};

export async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession();

    const user: any = session?.user;
    if (user?.id && typeof user.id === "string") {
      return user.id;
    }
    if (user?.email && typeof user.email === "string") {
      return user.email;
    }
  } catch (e) {
    // NextAuth session error - silent fail
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("vipeysession")?.value;

    if (!token) {
      return null;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return null;
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;

    if (decoded?.userId) {
      return String(decoded.userId);
    }
    if (decoded?.id) {
      return String(decoded.id);
    }
    if (decoded?.email) {
      return String(decoded.email);
    }

    return null;
  } catch (e) {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const uid = await getUserId();
  return uid !== null;
}

export async function getAuthSession() {
  try {
    const session = await getServerSession();
    return session;
  } catch (e) {
    return null;
  }
}

// Enhanced debug function
export async function debugAuthDetailed() {
  try {
    // Check NextAuth session
    const session = await getServerSession();

    // Check cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Check specific cookies
    const vipeyCookie = cookieStore.get("vipeysession");
    const nextAuthCookie = cookieStore.get("next-auth.session-token") ||
      cookieStore.get("__Secure-next-auth.session-token");

    // Try getUserId
    const userId = await getUserId();

    return {
      session,
      cookies: {
        vipeysession: !!vipeyCookie?.value,
        nextAuth: !!nextAuthCookie?.value,
        total: allCookies.length
      },
      environment: {
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET
      },
      userId,
      isAuthenticated: !!userId
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}