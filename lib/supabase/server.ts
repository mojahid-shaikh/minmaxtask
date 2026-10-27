import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const store = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables. See .env.example'
    );
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return store.getAll();
      },

      setAll(
        toSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[]
      ) {
        try {
          toSet.forEach(({ name, value, options }) => {
            store.set(name, value, options);
          });
        } catch {
          // Render-time cookies are read-only.
          // middleware.ts handles session refresh.
        }
      },
    },
  });
}