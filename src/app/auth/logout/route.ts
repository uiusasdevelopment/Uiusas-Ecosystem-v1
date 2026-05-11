import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const supabase = createClient()
  
  // Encerra sessão no Supabase se houver
  await supabase.auth.signOut()
  
  // Apaga a pulseira de convidado
  cookies().delete('uiusas_guest')
  
  // Redireciona de volta para a tela de login
  return NextResponse.redirect(`${origin}/login`)
}
