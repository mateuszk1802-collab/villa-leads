import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkSupabaseEnv } from "./env";

const PUBLIC_PATHS = ["/login"];

function configError(message: string) {
  return new NextResponse(message, {
    status: 500,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function updateSession(request: NextRequest) {
  const env = checkSupabaseEnv();
  if (!env.ok) return configError(env.message);

  let response = NextResponse.next({ request });
  let loggedIn = false;

  try {
    const supabase = createServerClient(env.url, env.key, {
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
    const { data } = await supabase.auth.getClaims();
    loggedIn = Boolean(data?.claims);
  } catch (e) {
    console.error("Supabase proxy error", e);
    return configError(
      "Nie można połączyć się z Supabase. Sprawdź w Vercel, czy NEXT_PUBLIC_SUPABASE_URL " +
        "to dokładnie Project URL (https://….supabase.co), a klucz to Publishable key. Potem Redeploy.\n\n" +
        `Szczegóły: ${e instanceof Error ? e.message : String(e)}`,
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
    to.pathname = "/today";
    to.search = "";
    return NextResponse.redirect(to);
  }

  return response;
}
