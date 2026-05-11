import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Remove cookie de convidado
      cookies().delete('uiusas_guest')

      // Garante que o perfil existe (safety net além do trigger)
      await supabase
        .from('users_profile')
        .upsert({
          id: data.user.id,
          nivel: 'P1',
          cra: 0.00,
          is_admin: false,
          display_name: data.user.user_metadata?.full_name || data.user.email || 'Operador',
          avatar_id: 'Cpu',
          stats_data: {}
        }, { 
          onConflict: 'id', 
          ignoreDuplicates: true  // Não sobrescreve dados existentes
        })

      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/login?message=Falha na autenticação via Google.`)
}
