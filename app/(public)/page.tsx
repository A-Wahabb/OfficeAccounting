import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? ROUTES.dashboard : ROUTES.login);
}
