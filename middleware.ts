import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[middleware] Supabase env vars missing — skipping session refresh");
    return NextResponse.next({ request });
  }

  // This mutable variable is the key to Supabase SSR cookie propagation.
  // setAll() recreates it from the updated request so downstream Server Components
  // receive the refreshed session in the same request.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // 1. Write new cookies onto the request object so Server Components can read them.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // 2. Recreate the response from the updated request — this is what makes the
        //    new session visible to Server Components in the same render.
        supabaseResponse = NextResponse.next({ request });
        // 3. Also set the cookies on the response so the browser stores the refresh.
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // IMPORTANT: Do not add any logic between createServerClient and getUser().
  // getUser() triggers a token refresh if the access token is expired.
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error("[middleware] getUser error:", error.message);
  }

  if (!user) {
    const isPublicPath =
      request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/auth") ||
      request.nextUrl.pathname.startsWith("/register");

    if (!isPublicPath) {
      console.warn("[middleware] No session for path:", request.nextUrl.pathname, "— redirecting to /login");
    }
  }

  // IMPORTANT: Return supabaseResponse as-is. Do not create a new NextResponse here.
  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
