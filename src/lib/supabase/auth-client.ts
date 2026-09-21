import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export async function supabaseSignIn(email: string, password: string) {
  const client = createSupabaseBrowserClient();
  const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(error.message);
}

export async function supabaseSignUp(name: string, email: string, password: string) {
  const client = createSupabaseBrowserClient();
  const { error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim() } },
  });
  if (error) throw new Error(error.message);
}

export async function supabaseSignOut() {
  const client = createSupabaseBrowserClient();
  await client.auth.signOut();
}
