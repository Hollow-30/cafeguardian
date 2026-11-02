import { createClient } from "@/lib/supabase/server"
import type { AuthUserLike } from "@/lib/auth/roles"

export async function getAuthUser(): Promise<AuthUserLike> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    return data.user
  } catch {
    return null
  }
}
