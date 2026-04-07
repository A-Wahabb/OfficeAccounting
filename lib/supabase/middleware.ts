import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { fetchUserRoles } from "@/lib/auth/fetch-roles";
import type { AppRole } from "@/lib/auth/types";
import { publicEnv } from "@/lib/env";

export type MiddlewareSession = {
  response: NextResponse;
  user: User | null;
  roles: AppRole[];
};

/**
 * Refreshes the user session, returns response with Set-Cookie headers, user, and roles from user_roles.
 */
export async function getMiddlewareSession(
  request: NextRequest,
): Promise<MiddlewareSession> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let roles: AppRole[] = [];
  if (user) {
    roles = await fetchUserRoles(supabase, user.id);
  }

  return { response, user, roles };
}

/** @deprecated Use getMiddlewareSession — kept for any external import */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null }> {
  const { response, user } = await getMiddlewareSession(request);
  return { response, user };
}
