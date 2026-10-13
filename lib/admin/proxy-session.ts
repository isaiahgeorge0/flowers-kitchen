import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublicEnv } from "@/lib/supabase-public-env";

export const ADMIN_PATH_HEADER = "x-fk-admin-path";

const PUBLIC_ADMIN_PATHS = ["/admin/sign-in", "/admin/unauthorized"];

function isPublicAdminPath(pathname: string) {
  return PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase session cookie on every admin request, forwards the pathname so
 * page guards can build a safe `next` redirect, and sends signed-out page visits straight
 * to sign-in. This is only the optimistic check: every page and action verifies staff
 * access itself.
 */
export async function updateAdminSession(request: NextRequest): Promise<NextResponse> {
  const { url, publishableKey } = supabasePublicEnv();
  const { pathname, search } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(ADMIN_PATH_HEADER, pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPageVisit = request.method === "GET" && !request.headers.has("next-action");
  if (!user && isPageVisit && !isPublicAdminPath(pathname)) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/admin/sign-in";
    signIn.search = "";
    if (pathname !== "/admin") {
      signIn.searchParams.set("next", `${pathname}${search}`);
    }
    const redirect = NextResponse.redirect(signIn);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("X-Robots-Tag", "noindex, nofollow");
    return redirect;
  }

  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
