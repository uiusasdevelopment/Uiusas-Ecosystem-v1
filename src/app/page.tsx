"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, BookOpen, Activity, Database, ShieldAlert, Cpu, 
  Crosshair, Zap, TrendingUp, ChevronRight, Server, Sun, Moon
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { UiusasLogo } from '@/components/UiusasLogo';
import { QuestionBank } from '@/components/QuestionBank';
import { SimulatorEngine } from '@/components/SimulatorEngine';
import { AdminSimulationManager } from '@/components/AdminSimulationManager';
import dynamic from 'next/dynamic';
import { OnboardingModal } from '@/components/OnboardingModal';
import { StudyManager } from '@/components/StudyManager';
import { OfficialSimulationsTab } from '@/components/OfficialSimulationsTab';

const PdfLibrary = dynamic(() => import('@/components/PdfLibrary').then(mod => mod.PdfLibrary), { ssr: false });

// ==========================================
// MOCK DATA & ICONS
// ==========================================
const mockData = {
  disciplinas: ['Farmacologia', 'Imunologia', 'Patologia'],
  mandamentos: [
    'I. Consistência é a única variável que você controla na academia.',
    'II. O conhecimento cresce quando compartilhado com os colegas.'
  ]
};

const TargetIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);

const TABS = [
  { id: 0, name: 'DASHBOARD', fullName: 'CENTRAL DE COMANDO', icon: Activity },
  { id: 1, name: 'BANCO', fullName: 'MATRIZ DE QUESTÕES', icon: Database },
  { id: 2, name: 'PDFS', fullName: 'ACERVO DE PDFS', icon: BookOpen },
  { id: 3, name: 'SIMULADOS', fullName: 'SALA DE TREINAMENTO', icon: TargetIcon }
];

const MODULES = [
  { id: 'dashboard', label: 'DASHBOARD', color: 'cyan', colorClass: 'cyan-400', bgClass: 'bg-cyan-900/30' },
  { id: 'revisoes', label: 'REVISÕES PEND.', color: 'fuchsia', colorClass: 'fuchsia-400', bgClass: 'bg-fuchsia-900/30' },
  { id: 'erros', label: 'CADERNO DE ERROS', color: 'emerald', colorClass: 'emerald-400', bgClass: 'bg-emerald-900/30' }
];

const SAO_ITEMS = [
  { name: 'PERFIL', icon: User },
  { name: 'TEMA', icon: Sun }
];

export interface UserProfile {
  id: string;
  email: string;
  nivel: string;
  cra: number;
  display_name: string;
  onboarding_complete?: boolean;
  active_subjects?: string[];
  total_points?: number;
}

interface LayoutProps {
  activeMod: string;
  setActiveMod: (id: string) => void;
  tab: number;
  setTab: (id: number) => void;
  isAdmin: boolean;
  userProfile: UserProfile | null;
  onOpenProfile: () => void;
  simulationQuestions: string[] | null;
  simulationTitle?: string;
  simulationSubject?: string;
  simulationId?: string;
  setSimulationQuestions: (ids: string[] | null, title?: string, subject?: string, id?: string) => void;
  questionCount: number;
  onOpenSimulationManager: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

// ==========================================
// COMPONENTES COMPARTILHADOS
// ==========================================
const DashboardContent = ({ userProfile, activeColor, questionCount }: { userProfile: UserProfile | null, activeColor: string, questionCount: number }) => {
  const isGuest = !userProfile;
  const name = userProfile ? userProfile.display_name.toUpperCase() : 'VISITANTE';
  const activeModules = userProfile?.active_subjects || [];

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Banner de Boas-Vindas */}
      <div className="relative border border-white/10 bg-black/40 p-6 md:p-8 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div className={`absolute top-0 left-0 w-1 h-full bg-${activeColor === 'cyan' ? 'cyan-500' : activeColor === 'fuchsia' ? 'fuchsia-500' : 'emerald-500'}`} />
        <h2 className="text-[10px] text-zinc-400 tracking-widest mb-1">STATUS DA CONEXÃO: <span className="text-emerald-400 font-bold">ESTÁVEL</span></h2>
        <h1 className="text-2xl md:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
          BEM-VINDO, <span className={`text-${activeColor === 'cyan' ? 'cyan-400' : activeColor === 'fuchsia' ? 'fuchsia-400' : 'emerald-400'} drop-shadow-[0_0_10px_currentColor]`}>{name}</span>
        </h1>
        {isGuest && (
          <div className="mt-6 border border-fuchsia-500/30 bg-fuchsia-950/20 p-4">
            <h3 className="text-fuchsia-400 text-[10px] tracking-widest font-bold mb-1 flex items-center gap-2">
              <ShieldAlert className="w-3 h-3" /> ATENÇÃO
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Você está operando em Modo Espectador. Seus dados de simulação e patentes não estão sendo salvos no banco de dados central. 
            </p>
            <Link href="/login" className="px-4 py-2 bg-fuchsia-900/40 border border-fuchsia-500 text-fuchsia-300 text-[10px] tracking-widest font-bold hover:bg-fuchsia-800 hover:text-white transition-colors inline-block">
              FAZER ALISTAMENTO / LOGIN
            </Link>
          </div>
        )}
      </div>

      {/* Grid de Ações Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href={isGuest ? "/login" : "/perfil"} className={`group relative p-6 border border-white/10 bg-white/5 hover:bg-${activeColor === 'cyan' ? 'cyan-950/40' : activeColor === 'fuchsia' ? 'fuchsia-950/40' : 'emerald-950/40'} hover:border-${activeColor === 'cyan' ? 'cyan-500/50' : activeColor === 'fuchsia' ? 'fuchsia-500/50' : 'emerald-500/50'} transition-all cursor-pointer flex flex-col items-center justify-center text-center`}>
          <div className={`absolute inset-0 bg-gradient-to-t from-${activeColor === 'cyan' ? 'cyan-500/10' : activeColor === 'fuchsia' ? 'fuchsia-500/10' : 'emerald-500/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
          <TargetIcon className={`w-8 h-8 mb-4 ${activeColor === 'cyan' ? 'text-cyan-400' : activeColor === 'fuchsia' ? 'text-fuchsia-400' : 'text-emerald-400'} group-hover:scale-110 transition-transform`} />
          <span className="text-sm font-bold tracking-widest mb-1 text-white">INICIAR MISSÃO</span>
          <span className="text-[10px] text-zinc-500 tracking-widest">GERADOR DE SIMULADOS</span>
        </Link>
        
        <Link href={isGuest ? "/login" : "/perfil"} className={`group relative p-6 border border-white/10 bg-white/5 hover:bg-${activeColor === 'cyan' ? 'cyan-950/40' : activeColor === 'fuchsia' ? 'fuchsia-950/40' : 'emerald-950/40'} hover:border-${activeColor === 'cyan' ? 'cyan-500/50' : activeColor === 'fuchsia' ? 'fuchsia-500/50' : 'emerald-500/50'} transition-all cursor-pointer flex flex-col items-center justify-center text-center`}>
          <div className={`absolute inset-0 bg-gradient-to-t from-${activeColor === 'cyan' ? 'cyan-500/10' : activeColor === 'fuchsia' ? 'fuchsia-500/10' : 'emerald-500/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
          <BookOpen className={`w-8 h-8 mb-4 ${activeColor === 'cyan' ? 'text-cyan-400' : activeColor === 'fuchsia' ? 'text-fuchsia-400' : 'text-emerald-400'} group-hover:scale-110 transition-transform`} />
          <span className="text-sm font-bold tracking-widest mb-1 text-white">ACESSAR ACERVO</span>
          <span className="text-[10px] text-zinc-500 tracking-widest">BIBLIOTECA DE DADOS</span>
        </Link>
      </div>

      {/* Info extra */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-white/10 p-4 bg-black/30 flex items-center gap-4">
          <Activity className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 tracking-widest">MÓDULOS ATIVOS</span>
            <span className="text-xs font-bold text-white tracking-widest uppercase">
              {activeModules.length > 0 ? activeModules.join(' // ') : 'NENHUM MÓDULO CONFIGURADO'}
            </span>
          </div>
        </div>
        <div className="border border-white/10 p-4 bg-black/30 flex items-center gap-4">
          <Database className="w-6 h-6 text-fuchsia-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 tracking-widest">QUESTÕES NO BANCO</span>
            <span className="text-xs font-bold text-white tracking-widest">{questionCount.toLocaleString()} REGISTROS LIDOS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// DESKTOP LAYOUT (PC Clássico)
// ==========================================
const DesktopLayout = ({ activeMod, setActiveMod, tab, setTab, isAdmin, userProfile, onOpenProfile, simulationQuestions, simulationTitle, simulationSubject, simulationId, setSimulationQuestions, questionCount, onOpenSimulationManager, theme, toggleTheme }: LayoutProps) => {
  const [saoCoreOpen, setSaoCoreOpen] = useState(false);
  const activeColor = MODULES.find(m => m.id === activeMod)?.color || 'cyan';

  const nivel = userProfile?.nivel || 'P1';
  const cra = userProfile?.cra || 0.00;

  return (
    <div className={`w-full h-full relative overflow-hidden flex flex-col text-white font-mono z-10 transition-all ${tab === 3 ? 'p-6 lg:p-8' : 'p-12'}`}>
      <div className="flex-1 flex gap-12 mt-8 pb-16 overflow-hidden">
        
        {/* Lado Esquerdo: Switches (Só mostra na aba 0) */}
        {tab === 0 && (
          <div className="w-64 flex flex-col gap-4 shrink-0">
            <div className="flex flex-col mb-8 border-b border-fuchsia-500/30 pb-4 items-center gap-4">
              <UiusasLogo className="w-20 h-20" />
              <div className="text-center font-[family-name:var(--font-orbitron)]">
                <h1 className="text-2xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-200">UIUSAS</h1>
                <h2 className="text-[10px] tracking-[0.6em] text-fuchsia-400 font-bold mt-1 ml-2">ECOSYSTEM</h2>
              </div>
            </div>
            {MODULES.map(mod => {
              const isActive = activeMod === mod.id;
              return (
                <button key={mod.id} onClick={() => setActiveMod(mod.id)} 
                  className={`group flex justify-between items-center p-3 border transition-all ${isActive ? `border-${mod.colorClass} ${mod.bgClass} shadow-[0_0_15px_rgba(var(--${mod.color}-rgb),0.3)]` : 'border-white/20 hover:border-white/50 bg-black/50 backdrop-blur-sm'}`}>
                  <div className="flex items-center gap-2">
                    <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? `text-${mod.colorClass} rotate-90` : 'text-zinc-500 opacity-50 group-hover:opacity-100'}`} />
                    <span className={`text-xs tracking-widest ${isActive ? `text-${mod.colorClass} font-bold` : 'text-zinc-400'}`}>{mod.label}</span>
                  </div>
                  <div className={`w-8 h-3 border ${isActive ? `bg-${mod.colorClass} border-${mod.colorClass}` : 'border-white/30'} transition-all`} />
                </button>
              )
            })}
          </div>
        )}

        {/* Centro: Pop-ups Ancorados ou Fullscreen */}
        <div className={`flex-1 relative overflow-y-auto pr-4 custom-scrollbar transition-all ${tab === 3 ? 'pb-4' : 'pb-12'}`}>
          {tab === 1 ? (
            <QuestionBank 
              userProfile={userProfile} 
              isAdmin={isAdmin} 
              onStartSimulation={(ids, title, sub, id) => { setSimulationQuestions(ids, title, sub, id); setTab(3); }} 
              onOpenSimulationManager={onOpenSimulationManager}
            />
          ) : tab === 2 ? (
            <PdfLibrary userProfile={userProfile} isAdmin={isAdmin} />
          ) : tab === 3 ? (
            simulationQuestions ? (
              <SimulatorEngine 
                questionIds={simulationQuestions} 
                userProfile={userProfile} 
                onExit={() => { setSimulationQuestions(null); setTab(3); }} 
                simulationTitle={simulationTitle}
                simulationSubject={simulationSubject}
                simulationId={simulationId}
              />
            ) : (
              <OfficialSimulationsTab 
                onStartSimulation={(ids, title, sub, id) => { setSimulationQuestions(ids, title, sub, id); }}
                onGoToBank={() => setTab(1)}
                isAdmin={isAdmin}
                onOpenAdminManager={onOpenSimulationManager}
              />
            )
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={activeMod} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}
                className={`relative bg-black/70 backdrop-blur-xl border p-8 ${activeColor === 'cyan' ? 'border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.15)]' : activeColor === 'fuchsia' ? 'border-fuchsia-500/50 shadow-[0_0_30px_rgba(217,70,239,0.15)]' : 'border-emerald-500/50 shadow-[0_0_30px_rgba(52,211,153,0.15)]'}`}
              >
                <svg className="absolute -left-[50px] top-8 w-[50px] h-2 overflow-visible pointer-events-none">
                  <path d="M 0 0 L 50 0" stroke={activeColor === 'cyan' ? "rgba(34,211,238,0.5)" : activeColor === 'fuchsia' ? "rgba(217,70,239,0.5)" : "rgba(52,211,153,0.5)"} strokeWidth="2" strokeDasharray="4 2" />
                  <circle cx="50" cy="0" r="3" fill={activeColor === 'cyan' ? "rgba(34,211,238,1)" : activeColor === 'fuchsia' ? "rgba(217,70,239,1)" : "rgba(52,211,153,1)"} />
                </svg>

                {activeMod === 'dashboard' ? (
                  <DashboardContent 
                    userProfile={userProfile} 
                    activeColor={activeColor} 
                    questionCount={questionCount}
                  />
                ) : activeMod === 'revisoes' ? (
                  <StudyManager 
                    userProfile={userProfile} 
                    type="REVIEWS" 
                    onStartSimulation={(ids, title, sub, id) => { setSimulationQuestions(ids, title, sub, id); setTab(3); }} 
                  />
                ) : activeMod === 'erros' ? (
                  <StudyManager 
                    userProfile={userProfile} 
                    type="ERRORS" 
                    onStartSimulation={(ids, title, sub, id) => { setSimulationQuestions(ids, title, sub, id); setTab(3); }} 
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-8">
                    <div className="col-span-2 border border-white/10 p-6 bg-white/5 text-center">
                      <h2 className="text-zinc-500 tracking-widest mb-2">MÓDULO EM CONSTRUÇÃO</h2>
                      <p className="text-zinc-600 text-sm">Este módulo de navegação está sendo integrado à matriz principal.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* SAO Core */}
      <div className="absolute top-12 right-12 z-50">
        <button onClick={() => setSaoCoreOpen(!saoCoreOpen)} className="relative w-16 h-16 rounded-full border border-cyan-400/50 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:bg-cyan-900/50 transition-all z-10 group">
          <div className={`absolute inset-0 rounded-full border border-dashed border-cyan-400/50 transition-all duration-1000 ${saoCoreOpen ? 'animate-[spin_5s_linear_infinite]' : ''}`} />
          <Cpu className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" /><span className="text-[8px] tracking-widest text-cyan-400 mt-1">CORE</span>
        </button>
        <AnimatePresence>
          {saoCoreOpen && SAO_ITEMS.map((item, i) => {
            const angle = Math.PI + (i * (0.5 * Math.PI)) / Math.max(SAO_ITEMS.length - 1, 1);
            const Icon = item.name === 'TEMA' ? (theme === 'dark' ? Moon : Sun) : item.icon;
            return (
              <motion.div key={item.name} initial={{ x: 0, y: 0, opacity: 0, scale: 0 }} animate={{ x: Math.cos(angle) * 100, y: -Math.sin(angle) * 100, opacity: 1, scale: 1 }} exit={{ x: 0, y: 0, opacity: 0, scale: 0 }} className="absolute top-0 left-0 z-0">
                <div onClick={item.name === 'PERFIL' ? onOpenProfile : item.name === 'TEMA' ? toggleTheme : undefined} className={`w-14 h-14 rounded-full border flex flex-col items-center justify-center text-[8px] cursor-pointer shadow-lg hover:scale-110 transition-all ${theme === 'dark' ? 'bg-black/90 border-cyan-500/50 text-cyan-300' : 'bg-white/90 border-[#8b8675]/30 text-[#454138]'}`}>
                  <Icon className="w-4 h-4 mb-1" />
                  {item.name}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Abas Trapezoidais */}
      <div className="absolute bottom-0 left-0 w-full h-16 flex items-end justify-center gap-2 px-4 z-40 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-cyan-500/50" />
        {TABS.map((t, i) => (
          <button key={t.name} onClick={() => setTab(i)} style={{ clipPath: 'polygon(15px 0, calc(100% - 15px) 0, 100% 100%, 0% 100%)' }} className={`px-12 py-3 flex gap-2 border-t border-x relative ${tab === i ? 'bg-cyan-950/90 border-cyan-400 text-cyan-300 pb-4 shadow-[0_-5px_20px_rgba(34,211,238,0.2)] z-10' : 'bg-black/80 border-cyan-500/30 text-zinc-500 hover:bg-cyan-900/40 hover:text-cyan-400 backdrop-blur-xl z-0'}`}>
            {tab === i && <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" />}
            <t.icon className="w-4 h-4 shrink-0" /><span className="text-xs tracking-widest font-bold">{t.fullName}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// TABLET LAYOUT (Otimizado, Menus no Topo)
// ==========================================
const TabletLayout = ({ activeMod, setActiveMod, tab, setTab, isAdmin, userProfile, onOpenProfile, simulationQuestions, simulationTitle, simulationSubject, simulationId, setSimulationQuestions, questionCount, onOpenSimulationManager, theme, toggleTheme }: LayoutProps) => {
  const [saoCoreOpen, setSaoCoreOpen] = useState(false);
  const activeColor = MODULES.find(m => m.id === activeMod)?.color || 'cyan';

  const nivel = userProfile?.nivel || 'P1';
  const cra = userProfile?.cra || 0.00;

  return (
    <div className="w-full h-full relative flex flex-col text-white font-mono z-10">
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-24 custom-scrollbar">
        
        {/* Topo: SAO Core & Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <UiusasLogo className="w-12 h-12" />
            <div className="flex flex-col font-[family-name:var(--font-orbitron)]">
              <h1 className="text-xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-200">UIUSAS</h1>
              <h2 className="text-[9px] tracking-[0.4em] text-fuchsia-400 font-bold mt-0.5">ECOSYSTEM // TBLT</h2>
            </div>
          </div>
          <div className="relative z-50">
            <button onClick={() => setSaoCoreOpen(!saoCoreOpen)} className="w-12 h-12 rounded-full border border-cyan-400/50 bg-black/80 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              <Cpu className="w-4 h-4 text-cyan-400" /><span className="text-[6px] tracking-widest text-cyan-400">CORE</span>
            </button>
            <AnimatePresence>
              {saoCoreOpen && SAO_ITEMS.map((item, i) => {
                const angle = Math.PI + (i * Math.PI) / 2;
                const Icon = item.name === 'TEMA' ? (theme === 'dark' ? Moon : Sun) : item.icon;
                return (
                  <motion.div key={item.name} initial={{ opacity: 0, scale: 0 }} animate={{ x: Math.cos(angle) * 70, y: -Math.sin(angle) * 70, opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} className="absolute top-0 left-0">
                    <div onClick={item.name === 'PERFIL' ? onOpenProfile : item.name === 'TEMA' ? toggleTheme : undefined} className={`w-10 h-10 rounded-full border flex flex-col items-center justify-center text-[6px] shadow-md cursor-pointer transition-all ${theme === 'dark' ? 'bg-black/90 border-cyan-500/50 text-cyan-300' : 'bg-white/90 border-[#8b8675]/30 text-[#454138]'}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Switches Horizontais (Só na aba 0) */}
        {tab === 0 && (
          <div className="flex gap-2 mb-6">
            {MODULES.map(mod => {
              const isActive = activeMod === mod.id;
              return (
                <button key={mod.id} onClick={() => setActiveMod(mod.id)} className={`flex-1 flex flex-col items-center justify-center p-3 border transition-all ${isActive ? `border-${mod.colorClass} ${mod.bgClass} shadow-[0_0_10px_rgba(var(--${mod.color}-rgb),0.3)]` : 'border-white/20 bg-black/50'}`}>
                  <span className={`text-[9px] tracking-widest mb-1 ${isActive ? `text-${mod.colorClass} font-bold` : 'text-zinc-400'}`}>{mod.label}</span>
                  <div className={`w-8 h-1 ${isActive ? `bg-${mod.colorClass}` : 'bg-white/30'}`} />
                </button>
              )
            })}
          </div>
        )}

        {/* Área Central: Pop-ups Ancorados ou Fullscreen */}
        {tab === 1 ? (
          <QuestionBank 
            userProfile={userProfile} 
            isAdmin={isAdmin} 
            onStartSimulation={(ids, title, sub, id) => { setSimulationQuestions(ids, title, sub, id); setTab(3); }} 
            onOpenSimulationManager={onOpenSimulationManager}
          />
        ) : tab === 2 ? (
          <PdfLibrary userProfile={userProfile} isAdmin={isAdmin} />
        ) : tab === 3 ? (
          simulationQuestions ? (
            <SimulatorEngine 
              questionIds={simulationQuestions} 
              userProfile={userProfile} 
              onExit={() => { setSimulationQuestions(null); setTab(3); }} 
              simulationTitle={simulationTitle}
              simulationSubject={simulationSubject}
              simulationId={simulationId}
            />
          ) : (
            <OfficialSimulationsTab 
              onStartSimulation={(ids, title, sub, id) => { setSimulationQuestions(ids, title, sub, id); }}
              onGoToBank={() => setTab(1)}
              isAdmin={isAdmin}
              onOpenAdminManager={onOpenSimulationManager}
            />
          )
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeMod} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}
              className={`bg-black/70 backdrop-blur-xl border p-6 ${activeColor === 'cyan' ? 'border-cyan-500/50' : activeColor === 'fuchsia' ? 'border-fuchsia-500/50' : 'border-emerald-500/50'}`}
            >
              {activeMod === 'dashboard' ? (
                <DashboardContent 
                  userProfile={userProfile} 
                  activeColor={activeColor} 
                  questionCount={questionCount}
                />
              ) : activeMod === 'revisoes' ? (
                <StudyManager 
                  userProfile={userProfile} 
                  type="REVIEWS" 
                  onStartSimulation={(ids, title, sub, id) => { setSimulationQuestions(ids, title, sub, id); setTab(3); }} 
                />
              ) : activeMod === 'erros' ? (
                <StudyManager 
                  userProfile={userProfile} 
                  type="ERRORS" 
                  onStartSimulation={(ids, title, sub, id) => { setSimulationQuestions(ids, title, sub, id); setTab(3); }} 
                />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 border border-white/10 p-6 bg-white/5 text-center">
                    <h2 className="text-zinc-500 tracking-widest mb-2 text-[10px]">MÓDULO EM CONSTRUÇÃO</h2>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

      </div>

      {/* Abas Trapezoidais Fixas na Base */}
      <div className="absolute bottom-0 left-0 w-full h-14 flex items-end justify-center gap-1 px-2 z-40 bg-black/90 backdrop-blur-xl">
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-cyan-500/50" />
        {TABS.map((t, i) => (
          <button key={t.name} onClick={() => setTab(i)} style={{ clipPath: 'polygon(10px 0, calc(100% - 10px) 0, 100% 100%, 0% 100%)' }} className={`flex-1 py-2 flex justify-center items-center gap-1 border-t border-x relative ${tab === i ? 'bg-cyan-950/90 border-cyan-400 text-cyan-300 pb-3' : 'bg-black/80 border-cyan-500/30 text-zinc-500 hover:text-cyan-400 transition-colors'}`}>
            {tab === i && <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400" />}
            <t.icon className="w-3 h-3 shrink-0" /><span className="text-[8px] tracking-widest font-bold">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// MOBILE LAYOUT (App Nativo Sci-Fi)
// ==========================================
const MobileLayout = ({ activeMod, setActiveMod, tab, setTab, isAdmin, userProfile, onOpenProfile, simulationQuestions, simulationTitle, simulationSubject, simulationId, setSimulationQuestions, questionCount, onOpenSimulationManager, theme, toggleTheme }: LayoutProps) => {
  const [saoCoreOpen, setSaoCoreOpen] = useState(false);
  const activeColor = MODULES.find(m => m.id === activeMod)?.color || 'cyan';

  const nivel = userProfile?.nivel || 'P1';
  const cra = userProfile?.cra || 0.00;

  return (
    <div className="w-full h-full relative flex flex-col text-white font-mono z-10 bg-black/40">
      
      {/* Header Fixo Mobile */}
      <div className="shrink-0 w-full bg-black/90 backdrop-blur-md border-b border-zinc-800 z-40 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <UiusasLogo className="w-10 h-10" />
          <div className="flex flex-col font-[family-name:var(--font-orbitron)]">
            <h1 className="text-base font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-200">UIUSAS</h1>
            <h2 className="text-[7px] text-fuchsia-400 tracking-[0.4em] font-bold mt-0.5">ECOSYSTEM // V1.0</h2>
          </div>
        </div>
        
        {/* SAO Core Minimizado */}
        <div className="relative">
          <button onClick={() => setSaoCoreOpen(!saoCoreOpen)} className="w-8 h-8 rounded-full border border-cyan-400/50 bg-black/80 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-cyan-400" />
          </button>
          <AnimatePresence>
            {saoCoreOpen && SAO_ITEMS.map((item, i) => {
              const angle = Math.PI + (i * Math.PI) / 2;
              const Icon = item.name === 'TEMA' ? (theme === 'dark' ? Moon : Sun) : item.icon;
              return (
                <motion.div key={item.name} initial={{ opacity: 0, scale: 0 }} animate={{ x: Math.cos(angle) * 50, y: -Math.sin(angle) * 50, opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} className="absolute top-0 left-0">
                  <div onClick={item.name === 'PERFIL' ? onOpenProfile : item.name === 'TEMA' ? toggleTheme : undefined} className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-md cursor-pointer transition-all ${theme === 'dark' ? 'bg-cyan-950 border-cyan-500/50 text-cyan-300' : 'bg-white border-[#8b8675]/30 text-[#454138]'}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Lista de Módulos (Só na aba 0) */}
      {tab === 0 && (
        <div className="w-full overflow-x-auto p-4 flex gap-2 hide-scrollbar shrink-0 border-b border-white/5 bg-black/50">
          {MODULES.map(mod => {
            const isActive = activeMod === mod.id;
            return (
              <button key={mod.id} onClick={() => setActiveMod(mod.id)} className={`px-4 py-2 shrink-0 rounded-full border text-[9px] tracking-widest transition-all ${isActive ? `border-${mod.colorClass} ${mod.bgClass} text-${mod.colorClass} shadow-[0_0_10px_rgba(var(--${mod.color}-rgb),0.3)]` : 'border-white/20 bg-black/50 text-zinc-500'}`}>
                {mod.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Area Central */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-20 custom-scrollbar">
        {tab === 1 ? (
          <QuestionBank 
            userProfile={userProfile} 
            isAdmin={isAdmin} 
            onStartSimulation={(ids, title, sub, id) => { setSimulationQuestions(ids, title, sub, id); setTab(3); }} 
            onOpenSimulationManager={onOpenSimulationManager}
          />
        ) : tab === 2 ? (
          <PdfLibrary userProfile={userProfile} isAdmin={isAdmin} />
        ) : tab === 3 ? (
          simulationQuestions ? (
            <SimulatorEngine 
              questionIds={simulationQuestions} 
              userProfile={userProfile} 
              onExit={() => { setSimulationQuestions(null); setTab(3); }} 
              simulationTitle={simulationTitle}
              simulationSubject={simulationSubject}
              simulationId={simulationId}
            />
          ) : (
            <OfficialSimulationsTab 
              onStartSimulation={(ids, title, sub, id) => { setSimulationQuestions(ids, title, sub, id); }}
              onGoToBank={() => setTab(1)}
              isAdmin={isAdmin}
              onOpenAdminManager={onOpenSimulationManager}
            />
          )
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeMod} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}
              className={`border rounded-xl p-4 bg-black/60 backdrop-blur-md ${activeColor === 'cyan' ? 'border-cyan-500/50' : activeColor === 'fuchsia' ? 'border-fuchsia-500/50' : 'border-emerald-500/50'}`}
            >
              {activeMod === 'dashboard' ? (
                <DashboardContent 
                  userProfile={userProfile} 
                  activeColor={activeColor} 
                  questionCount={questionCount}
                />
              ) : activeMod === 'revisoes' ? (
                <StudyManager 
                  userProfile={userProfile} 
                  type="REVIEWS" 
                  onStartSimulation={(ids, title, sub, id) => { setSimulationQuestions(ids, title, sub, id); setTab(3); }} 
                />
              ) : activeMod === 'erros' ? (
                <StudyManager 
                  userProfile={userProfile} 
                  type="ERRORS" 
                  onStartSimulation={(ids, title, sub, id) => { setSimulationQuestions(ids, title, sub, id); setTab(3); }} 
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="border border-white/5 p-4 rounded-lg bg-white/5 text-center">
                    <p className="text-[9px] text-zinc-500 tracking-widest">MÓDULO EM CONSTRUÇÃO</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="absolute bottom-0 left-0 w-full h-16 bg-black/90 backdrop-blur-xl border-t border-white/10 flex justify-around items-center px-2 z-50">
        {TABS.map((t, i) => {
          const isActive = tab === i;
          return (
            <button key={t.name} onClick={() => setTab(i)} className="flex flex-col items-center gap-1 p-2 w-16">
              <div className={`p-1.5 rounded-full transition-all ${isActive ? 'bg-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-transparent'}`}>
                <t.icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-zinc-600'}`} />
              </div>
              <span className={`text-[7px] tracking-widest ${isActive ? 'text-cyan-400 font-bold' : 'text-zinc-600'}`}>{t.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  );
};


// ==========================================
// CONTROLE PRINCIPAL (Responsividade Nativa)
// ==========================================
export default function UiusasDefinitive() {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeMod, setActiveMod] = useState('dashboard');
  const [tab, setTab] = useState(0);
  const [simulationQuestions, setSimulationQuestions] = useState<string[] | null>(null);
  const [simulationTitle, setSimulationTitle] = useState<string | undefined>();
  const [simulationSubject, setSimulationSubject] = useState<string | undefined>();
  const [simulationId, setSimulationId] = useState<string | undefined>();
  const [questionCount, setQuestionCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSimulationManager, setShowSimulationManager] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase.from('users_profile').select('*').eq('id', user.id).single();
        if (data) {
          setIsAdmin(!!data.is_admin);
          setUserProfile({
            id: user.id,
            email: user.email || '',
            nivel: data.nivel || 'P1',
            cra: data.cra || 0,
            display_name: data.display_name || '',
            onboarding_complete: !!data.onboarding_complete,
            active_subjects: data.active_subjects || [],
            total_points: data.total_points || 0
          });

          if (!data.onboarding_complete) {
            setShowOnboarding(true);
          }
        }
      } else {
        setIsAdmin(false);
        setUserProfile(null);
      }
      
      // Fetch Real Question Count
      const { count } = await supabase.from('quiz_questions').select('*', { count: 'exact', head: true });
      setQuestionCount(count || 0);

      setIsLoading(false);
    };
    checkUser();
  }, []);

  // Automatização de Layout
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 768) setDevice('mobile');
      else if (w < 1024) setDevice('tablet');
      else setDevice('desktop');
    };
    
    // Set initial
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleProfileUpdate = (newName: string, newNivel: string, newCra: number) => {
    setUserProfile(prev => prev ? { ...prev, display_name: newName, nivel: newNivel, cra: newCra } : null);
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const layoutProps: LayoutProps = {
    activeMod,
    setActiveMod,
    tab,
    setTab,
    isAdmin,
    userProfile,
    onOpenProfile: () => router.push('/perfil'),
    simulationQuestions,
    simulationTitle,
    simulationSubject,
    simulationId,
    setSimulationQuestions: (ids, title, sub, id) => {
      setSimulationQuestions(ids);
      setSimulationTitle(title);
      setSimulationSubject(sub);
      setSimulationId(id);
    },
    questionCount,
    onOpenSimulationManager: () => setShowSimulationManager(true),
    theme,
    toggleTheme
  };

  return (
    <div className={`w-screen h-screen overflow-hidden flex flex-col font-mono relative transition-colors duration-700 ${theme === 'dark' ? 'bg-black text-white' : 'bg-[#e2e2d5] text-[#454138] light-mode'}`}>
        
      {/* FUNDO ANIMADO */}
      {theme === 'dark' && (
        <>
          <motion.div animate={{ x: ["-50%", "-30%", "-60%", "-50%"], y: ["-50%", "-20%", "-70%", "-50%"] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="absolute top-0 left-0 w-[150%] h-[150%] bg-fuchsia-600/30 rounded-full blur-[100px] pointer-events-none" />
          <motion.div animate={{ x: ["10%", "30%", "-10%", "10%"], y: ["10%", "-10%", "30%", "10%"] }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }} className="absolute bottom-0 right-0 w-[150%] h-[150%] bg-cyan-600/20 rounded-full blur-[100px] pointer-events-none" />
        </>
      )}
      <div className={`absolute inset-0 pointer-events-none ${theme === 'dark' ? 'opacity-30' : 'opacity-10'}`} style={{ backgroundImage: `radial-gradient(${theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.8)'} 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
      
      {device === 'desktop' && (
        <>
          <div className="absolute left-[20%] top-0 bottom-0 w-[1px] bg-white/10 border-l border-dashed border-white/20 pointer-events-none" />
          <div className="absolute right-[20%] top-0 bottom-0 w-[1px] bg-white/10 border-l border-dashed border-white/20 pointer-events-none" />
        </>
      )}

      {/* RENDERIZAÇÃO AUTOMÁTICA */}
      <AnimatePresence mode="wait">
        <motion.div key={device} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full h-full absolute inset-0">
          {device === 'desktop' && <DesktopLayout {...layoutProps} />}
          {device === 'tablet' && <TabletLayout {...layoutProps} />}
          {device === 'mobile' && <MobileLayout {...layoutProps} />}
        </motion.div>
      </AnimatePresence>

      {/* MODAL DE ONBOARDING */}
      {userProfile && (
        <OnboardingModal 
          isOpen={showOnboarding} 
          userId={userProfile.id} 
          onComplete={(name, nivel, subjects) => {
            setUserProfile(prev => prev ? { ...prev, display_name: name, nivel, active_subjects: subjects, onboarding_complete: true } : null);
            setShowOnboarding(false);
          }}
        />
      )}
      
      {/* Global Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Light Mode Overrides */
        .light-mode .bg-black, .light-mode .bg-black\\/90, .light-mode .bg-black\\/80, .light-mode .bg-black\\/60, .light-mode .bg-black\\/40, .light-mode .bg-black\\/50 { background-color: rgba(220, 220, 205, 0.9) !important; backdrop-filter: blur(20px); }
        .light-mode .border-white\\/10, .light-mode .border-white\\/5, .light-mode .border-zinc-800, .light-mode .border-cyan-500\\/50 { border-color: rgba(69, 65, 56, 0.2) !important; }
        .light-mode .text-zinc-400, .light-mode .text-zinc-500, .light-mode .text-zinc-600, .light-mode .text-cyan-300 { color: #8b8675 !important; }
        .light-mode .text-white, .light-mode .text-cyan-400 { color: #454138 !important; }
        .light-mode .bg-white\\/5 { background-color: rgba(69, 65, 56, 0.08) !important; }
        .light-mode .bg-white\\/10 { background-color: rgba(69, 65, 56, 0.12) !important; }
        .light-mode .shadow-\\[0_0_20px_rgba\\(0\\,0\\,0\\,0\\.5\\)\\] { shadow: 0 10px 30px rgba(69, 65, 56, 0.1) !important; }
        .light-mode .bg-cyan-500\\/20 { background-color: rgba(69, 65, 56, 0.1) !important; }
        .light-mode .bg-cyan-950\\/90 { background-color: rgba(69, 65, 56, 0.15) !important; }
        .light-mode .bg-cyan-900\\/30 { background-color: rgba(69, 65, 56, 0.1) !important; }
        .light-mode .text-fuchsia-400 { color: #a66a7b !important; }
        .light-mode .text-emerald-400 { color: #6a8c6a !important; }
        .light-mode .from-white { --tw-gradient-from: #454138 !important; }
        .light-mode .to-cyan-200 { --tw-gradient-to: #8b8675 !important; }
        .light-mode .bg-gradient-to-t { background-image: linear-gradient(to top, rgba(220, 220, 205, 0.95), transparent) !important; }
      `}} />
      {/* MODAL GESTOR DE SIMULADOS (GLOBAL) */}
      <AnimatePresence>
        {showSimulationManager && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-6xl h-[85vh]">
              <AdminSimulationManager 
                onClose={() => setShowSimulationManager(false)} 
                onTestSimulation={(ids, title, sub, id) => { 
                  setSimulationQuestions(ids); 
                  setSimulationTitle(title);
                  setSimulationSubject(sub);
                  setSimulationId(id);
                  setTab(3); 
                  setShowSimulationManager(false); 
                }} 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
