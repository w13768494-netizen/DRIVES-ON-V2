import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// Le singleton ne doit PAS être créé au niveau module.
// Turbopack évalue ce module dans le contexte RSC du navigateur lors de la
// résolution des boundaries 'use client', avant que les process.env.NEXT_PUBLIC_*
// soient substitués — ce qui rend la clé Supabase undefined et crash.
//
// Solution : Proxy lazy. L'appel à createClient() est différé au premier accès
// réel, qui se produit dans un useEffect ou handler (jamais au module load).

let _client: SupabaseClient | null = null

function getInstance(): SupabaseClient {
  return (_client ??= createClient())
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getInstance()
    const val = client[prop as keyof SupabaseClient]
    return typeof val === 'function' ? (val as Function).bind(client) : val
  },
})
