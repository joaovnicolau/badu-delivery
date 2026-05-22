import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

declare global {
  interface Window {
    __SUPABASE_URL__?: string
    __SUPABASE_ANON_KEY__?: string
  }
}

export function createClient() {
  const url =
    (typeof window !== 'undefined' ? window.__SUPABASE_URL__ : undefined) ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ''
  const key =
    (typeof window !== 'undefined' ? window.__SUPABASE_ANON_KEY__ : undefined) ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ''

  if (typeof window !== 'undefined' && (!url || !key)) {
    console.error('[Supabase] URL ou Key ausente!', { url: url ? 'ok' : 'VAZIO', key: key ? 'ok' : 'VAZIO' })
  }

  return createBrowserClient<Database>(url, key)
}
