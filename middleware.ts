import { NextRequest, NextResponse } from "next/server";

// Fail closed in production; only local development can run without a password.
export async function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password && process.env.NODE_ENV === "production")
    return new NextResponse("Set APP_PASSWORD before serving this app.", { status: 503 });
  const machine = ["/api/ingest", "/api/edits", "/api/summary"].includes(req.nextUrl.pathname);
  // These routes independently require their scoped server-side tokens.
  if (!machine && password) {
    let supplied = "";
    try {
      const authorization = req.headers.get("authorization") || "";
      if (authorization.startsWith("Basic ")) supplied = atob(authorization.slice(6));
    } catch { /* Invalid credentials remain unauthorized. */ }
    const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
    const [a, b] = await Promise.all([digest(supplied), digest(`owner:${password}`)]);
    let difference = 0;
    for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
    if (difference !== 0) return new NextResponse("Authentication required", {
      status: 401, headers: { "WWW-Authenticate": 'Basic realm="MoMoney", charset="UTF-8"', "Cache-Control": "no-store" }
    });
  }
  if (!machine && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    let sameOrigin = false;
    try { sameOrigin = !!origin && new URL(origin).host === req.headers.get("host"); } catch {}
    if (!sameOrigin)
      return NextResponse.json({ error: "same-origin request required" }, { status: 403 });
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|icons/|favicon.ico).*)"] };
