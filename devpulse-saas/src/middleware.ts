/**
 * DevPulse AI — 权限中间件
 * 保护 /dashboard 等需要登录的页面
 * 基于 NextAuth JWT token 校验
 *
 * 社区模式：NEXT_PUBLIC_APP_MODE=community 时，
 * 根路径 / 自动重定向到 /community
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 需要登录才能访问的路径前缀
const PROTECTED_PATHS = ["/dashboard", "/api/stripe/checkout"];

// 不需要拦截的路径模式
const EXCLUDE_PATTERNS = [
  /\.(css|js|ico|png|jpg|svg|woff|woff2)$/,   // 静态资源
  /\/api\/auth\//,                              // NextAuth 内部路由
  /\/api\/reports/,                             // 公开日报 API
  /\/api\/community\//,                         // 社区版 API
  /^\/community/,                               // 社区版页面
  /^\/pricing$/,                                // 定价页
  /^\/demo$/,                                   // 示例页
  /^\/login$/,                                  // 登录页
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ===== 社区模式：根路径重定向到 /community =====
  const appMode = process.env.NEXT_PUBLIC_APP_MODE || "saas";
  if (appMode === "community" && pathname === "/") {
    const communityUrl = new URL("/community", request.url);
    return NextResponse.redirect(communityUrl);
  }

  // ===== SaaS 模式：社区版路径重定向到根 =====
  if (appMode === "saas" && pathname.startsWith("/community")) {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  // 排除不需要拦截的路径
  if (EXCLUDE_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return NextResponse.next();
  }

  // 检查是否在保护路径中
  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname.startsWith(path)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // 检查 NextAuth session token
  const sessionToken =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!sessionToken) {
    // 未登录：重定向到自定义登录页
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
