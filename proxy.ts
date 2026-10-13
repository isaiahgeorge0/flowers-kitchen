import type { NextRequest } from "next/server";
import { updateAdminSession } from "@/lib/admin/proxy-session";

export function proxy(request: NextRequest) {
  return updateAdminSession(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
