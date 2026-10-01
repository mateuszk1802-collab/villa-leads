import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MISSING_ENV_MESSAGE, supabaseEnvOrNull } from "./env";

const PUBLIC_PATHS = ["/login"];

export async function updateSession(request: NextRequest) {
  const env = supabaseEnvOrNull();
  if (!env) {
    return new NextResponse(MISSING_ENV_MESSAGE, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const { url, key } = env;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Odświeża sesję. Nie wstawiaj kodu między createServerClient a getClaims.
  let loggedIn = false;
  try {
    const { data } = await supabase.auth.getClaims();
    loggedIn = Boolean(data?.claims);
  } catch {
    return new NextResponse(
      "Nie można połączyć się z Supabase. Sprawdź w Vercel, czy NEXT_PUBLIC_SUPABASE_URL " +
        "to dokładnie Project URL (https://….supabase.co), a potem zrób Redeploy.",
      { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (!loggedIn && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  if (loggedIn && path === "/login") {
    const to = request.nextUrl.clone();
    to.pathname = "/leads";
    to.search = "";
    return NextResponse.redirect(to);
  }

  return response;
}
