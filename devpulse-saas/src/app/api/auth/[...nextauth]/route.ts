/**
 * NextAuth 路由处理器
 * 统一使用 @/lib/auth 中的配置
 */
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
