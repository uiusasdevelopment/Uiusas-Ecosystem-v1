'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function loginWithGoogle() {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:3000/auth/callback',
    },
  })

  if (data.url) {
    redirect(data.url)
  }
}

export async function continueAsGuest() {
  // Define um cookie para indicar que o usuário é visitante
  cookies().set('uiusas_guest', 'true', { 
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    path: '/'
  })
  redirect('/')
}
