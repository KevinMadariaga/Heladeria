import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Chequeo optimista por rol. La autorización real está en cada Server Action (lib/auth-guard.ts).
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url));

  if (pathname === "/login") return role ? to(role === "admin" ? "/admin" : "/pos") : undefined;
  if (!role) return to("/login");
  if (pathname.startsWith("/admin") && role !== "admin") return to("/pos");
});

export const config = { matcher: ["/login", "/admin/:path*", "/pos/:path*"] };
