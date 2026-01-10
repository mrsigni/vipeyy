import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

type JwtPayload = {
  userId?: string;
  id?: string;
  email?: string;
};

export async function getUserId(): Promise<string | null> {
  console.log('🔍 getUserId - Starting authentication check...');
  
  // 1) Try next-auth session first
  try {
    console.log('🔐 Checking NextAuth session...');
    const session = await getServerSession();
    console.log('📋 NextAuth session:', {
      exists: !!session,
      user: session?.user,
      userKeys: session?.user ? Object.keys(session.user) : []
    });
    
    const user: any = session?.user;
    if (user?.id && typeof user.id === "string") {
      console.log('✅ NextAuth - Found user.id:', user.id);
      return user.id;
    }
    if (user?.email && typeof user.email === "string") {
      console.log('⚠️ NextAuth - Using email as fallback:', user.email);
      return user.email;
    }
    
    console.log('❌ NextAuth - No valid user ID found');
  } catch (e) {
    console.warn("❌ NextAuth session error:", e);
  }

  // 2) Fallback to custom JWT cookie "vipeysession"
  try {
    console.log('🍪 Checking custom vipeysession cookie...');
    const cookieStore = await cookies();
    const token = cookieStore.get("vipeysession")?.value;
    
    console.log('🎫 Custom token:', {
      exists: !!token,
      length: token?.length || 0,
      preview: token ? `${token.substring(0, 20)}...` : 'none'
    });
    
    if (!token) {
      console.log('❌ Custom JWT - No vipeysession cookie found');
      return null;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("❌ Custom JWT - Missing JWT_SECRET env");
      return null;
    }

    console.log('🔐 Verifying custom JWT token...');
    const decoded = jwt.verify(token, secret) as JwtPayload;
    console.log('✅ Custom JWT decoded:', {
      userId: decoded?.userId,
      id: decoded?.id,
      email: decoded?.email,
      keys: Object.keys(decoded || {})
    });
    
    if (decoded?.userId) {
      console.log('✅ Custom JWT - Found userId:', decoded.userId);
      return String(decoded.userId);
    }
    if (decoded?.id) {
      console.log('✅ Custom JWT - Found id:', decoded.id);
      return String(decoded.id);
    }
    if (decoded?.email) {
      console.log('⚠️ Custom JWT - Using email as fallback:', decoded.email);
      return String(decoded.email);
    }
    
    console.log('❌ Custom JWT - No valid user ID in token');
    return null;
  } catch (e) {
    console.error("❌ Custom JWT verification failed:", e);
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const uid = await getUserId();
  const isAuth = uid !== null;
  console.log('🔐 Authentication result:', { isAuthenticated: isAuth, userId: uid });
  return isAuth;
}

export async function getAuthSession() {
  try {
    const session = await getServerSession();
    console.log('📋 getAuthSession result:', !!session);
    return session;
  } catch (e) {
    console.error("Error getting session:", e);
    return null;
  }
}

// Enhanced debug function
export async function debugAuthDetailed() {
  console.log('🔍 === DETAILED AUTH DEBUG ===');
  
  try {
    // Check NextAuth session
    const session = await getServerSession();
    console.log('1️⃣ NextAuth Session:', JSON.stringify(session, null, 2));
    
    // Check cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('2️⃣ All Cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })));
    
    // Check specific cookies
    const vipeyCookie = cookieStore.get("vipeysession");
    const nextAuthCookie = cookieStore.get("next-auth.session-token") || 
                          cookieStore.get("__Secure-next-auth.session-token");
    
    console.log('3️⃣ Specific Cookies:', {
      vipeysession: !!vipeyCookie?.value,
      nextAuthSession: !!nextAuthCookie?.value
    });
    
    // Check environment
    console.log('4️⃣ Environment:', {
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nodeEnv: process.env.NODE_ENV
    });
    
    // Try getUserId
    const userId = await getUserId();
    console.log('5️⃣ Final getUserId result:', userId);
    
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
    console.error('💥 Debug error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}