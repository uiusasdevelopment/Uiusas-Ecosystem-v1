'use client';

import { loginWithGoogle, continueAsGuest } from './actions'
import { ShieldAlert, Globe, ChevronRight } from 'lucide-react'
import { UiusasLogo } from '@/components/UiusasLogo'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-mono overflow-hidden relative">
      
      {/* Background Lava Lamp */}
      <div className="absolute top-1/4 left-1/4 w-[150vw] md:w-[80vw] h-[150vw] md:h-[80vw] bg-fuchsia-600/20 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[150vw] md:w-[80vw] h-[150vw] md:h-[80vw] bg-cyan-600/10 rounded-full blur-[150px] translate-x-1/4 translate-y-1/4 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

      {/* Terminal Central */}
      <div className="w-full max-w-sm relative z-10 flex flex-col items-center gap-8">
        
        {/* Header Centralizado */}
        <div className="flex flex-col items-center gap-2">
          <UiusasLogo className="w-24 h-24 mb-2 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
          <div className="text-center font-[family-name:var(--font-orbitron)]">
            <h1 className="text-3xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-300">UIUSAS</h1>
            <h2 className="text-[10px] tracking-[0.6em] text-fuchsia-400 font-bold mt-1 ml-2">ECOSYSTEM</h2>
          </div>
          <div className="text-[8px] text-zinc-500 tracking-widest mt-4 border border-zinc-800 px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
            MEDICAL NEURAL LINK V1.0
          </div>
        </div>

        {/* Botoes de Acesso */}
        <form className="w-full flex flex-col gap-4">
          <button
            formAction={loginWithGoogle}
            className="w-full bg-white text-black py-4 text-xs tracking-widest font-bold hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              <path fill="none" d="M1 1h22v22H1z"/>
            </svg>
            LOGIN COM GOOGLE
          </button>

          <button
            formAction={continueAsGuest}
            className="w-full bg-black/60 backdrop-blur-xl border border-zinc-800 text-zinc-400 py-4 text-xs tracking-widest font-bold hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-center gap-3"
          >
            <Globe className="w-4 h-4" />
            EXPLORAR COMO CONVIDADO
          </button>

          {searchParams?.message && (
            <div className="bg-black/80 backdrop-blur-xl border border-fuchsia-500/50 p-4 mt-4 flex gap-3 items-start text-fuchsia-400 text-xs tracking-widest">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{searchParams.message}</p>
            </div>
          )}
        </form>

      </div>
    </div>
  )
}
