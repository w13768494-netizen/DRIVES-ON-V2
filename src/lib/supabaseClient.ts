import { createClient } from '@/lib/supabase/client'

// Singleton partagé — tous les services qui importent { supabase } obtiennent la même instance
export const supabase = createClient()
