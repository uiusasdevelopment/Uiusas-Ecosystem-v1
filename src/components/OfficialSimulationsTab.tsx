'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Target, Sparkles, ChevronRight, Loader2, 
  AlertTriangle, Play, BookOpen, Plus 
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Simulation {
  id: string;
  title: string;
  description: string;
  subject: string;
  period: string;
}

export function OfficialSimulationsTab({ 
  onStartSimulation, 
  onGoToBank,
  isAdmin,
  onOpenAdminManager
}: { 
  onStartSimulation: (ids: string[], title?: string, subject?: string, id?: string) => void;
  onGoToBank: () => void;
  isAdmin?: boolean;
  onOpenAdminManager?: () => void;
}) {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('ALL');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [progress, setProgress] = useState<Record<string, any>>({});
  const supabase = createClient();

  useEffect(() => {
    fetchSimulations();
  }, []);

  const fetchSimulations = async () => {
    setLoading(true);
    const { data: sims } = await supabase
      .from('quiz_simulations')
      .select('*')
      .eq('is_official', true)
      .order('created_at', { ascending: false });
    
    if (sims) {
      setSimulations(sims);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prog } = await supabase
          .from('quiz_simulation_progress')
          .select('simulation_id, completed, score_percentage, current_index')
          .eq('user_id', user.id);
        
        if (prog) {
          const progMap = prog.reduce((acc: any, curr: any) => {
            acc[curr.simulation_id] = curr;
            return acc;
          }, {});
          setProgress(progMap);
        }
      }
    }
    setLoading(false);
  };

  const handleStart = async (simId: string) => {
    const { data } = await supabase
      .from('quiz_simulation_questions')
      .select('question_id')
      .eq('simulation_id', simId)
      .order('question_order', { ascending: true });
    
    if (data && data.length > 0) {
      const sim = simulations.find(s => s.id === simId);
      onStartSimulation(data.map(d => d.question_id), sim?.title, sim?.subject, sim?.id);
    } else {
      alert("Este simulado não possui questões vinculadas.");
    }
  };

  const availableSubjects = Array.from(new Set(simulations.map(s => s.subject))).filter(Boolean).sort();
  const filteredSimulations = simulations.filter(sim => {
    const matchesPeriod = filterPeriod === 'ALL' || sim.period === filterPeriod;
    const matchesSubject = filterSubject === 'ALL' || sim.subject === filterSubject;
    return matchesPeriod && matchesSubject;
  });

  if (loading) {
    return (
      <div className="py-32 flex justify-center items-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Sincronizando Protocolos...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in duration-500">
      {/* Hero Section Simulados */}
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/40 p-10 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="relative z-10">
          <h2 className="text-[10px] font-black text-cyan-500 tracking-[0.5em] uppercase mb-3">Sala de Treinamento</h2>
          <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-4">Módulos de Simulação</h1>
          <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
            Acesse protocolos oficiais estruturados pela equipe administrativa ou crie seu próprio treinamento personalizado utilizando o acervo global de questões.
          </p>
        </div>
        <button 
          onClick={onGoToBank}
          className="relative group px-8 py-5 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <div className="p-3 bg-cyan-500/10 rounded-xl">
            <Plus className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="text-left">
            <div className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mb-1">Personalizado</div>
            <div className="text-xs font-black text-white uppercase">Criar Simulado</div>
          </div>
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4 flex-1">
            <h3 className="text-[10px] font-black tracking-[0.4em] text-zinc-600 uppercase whitespace-nowrap">Protocolos Disponíveis</h3>
            <div className="h-px w-full bg-zinc-900" />
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black text-zinc-400 focus:outline-none focus:border-cyan-500/50 transition-all uppercase tracking-widest"
            >
              <option value="ALL">TODOS OS PERÍODOS</option>
              {['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select 
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black text-zinc-400 focus:outline-none focus:border-cyan-500/50 transition-all uppercase tracking-widest"
            >
              <option value="ALL">TODAS AS CADEIRAS</option>
              {availableSubjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {isAdmin && (
              <button 
                onClick={onOpenAdminManager}
                className="flex items-center gap-2 px-4 py-2 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl text-[10px] font-black text-fuchsia-400 hover:bg-fuchsia-500 hover:text-black transition-all uppercase tracking-widest whitespace-nowrap"
              >
                <Plus className="w-3 h-3" /> Gestor
              </button>
            )}
          </div>
        </div>

        {filteredSimulations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSimulations.map(sim => (
              <button
                key={sim.id}
                onClick={() => handleStart(sim.id)}
                className="group relative flex flex-col text-left bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all overflow-hidden shadow-2xl"
              >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Target className="w-24 h-24 text-cyan-500" />
                </div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase">{sim.period || 'S/ PER'}</span>
                        <span className="text-[8px] font-black text-cyan-500/50 tracking-widest uppercase">{sim.subject || 'GERAL'}</span>
                      </div>
                      <span className="text-[10px] font-black text-cyan-400 tracking-widest uppercase">PRESET OFICIAL</span>
                    </div>
                  </div>
                  
                  <h4 className="text-xl font-black text-white leading-tight uppercase mb-3 group-hover:text-cyan-400 transition-colors">
                    {sim.title}
                  </h4>
                  
                  <p className="text-xs text-zinc-500 line-clamp-2 mb-6 leading-relaxed">
                    {sim.description || "Inicie este simulado oficial estruturado pela equipe administrativa."}
                  </p>

                  {progress[sim.id] && (
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-[8px] font-black tracking-widest uppercase ${progress[sim.id].completed ? 'text-emerald-500' : 'text-zinc-500'}`}>
                          {progress[sim.id].completed ? 'COMPLETO' : 'EM PROGRESSO'}
                        </span>
                        <span className="text-[8px] font-black text-cyan-500">
                          {progress[sim.id].completed ? `${Math.round(progress[sim.id].score_percentage)}% ACC` : `CONTINUAR`}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${progress[sim.id].completed ? 'bg-emerald-500' : 'bg-cyan-500'}`} 
                          style={{ width: progress[sim.id].completed ? '100%' : '40%' }} 
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                    <span className="text-[10px] text-zinc-600 font-bold tracking-[0.2em] uppercase flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Status: Ativo
                    </span>
                    <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-cyan-500 group-hover:text-black transition-all">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center bg-white/[0.02] border border-dashed border-white/5 rounded-[3rem]">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-10 h-10 text-zinc-700" />
            </div>
            <h3 className="text-lg font-black text-zinc-600 tracking-widest uppercase">Nenhum Protocolo Selado</h3>
            <p className="text-xs text-zinc-700 mt-2">Aguardando diretrizes administrativas para novos presets.</p>
          </div>
        )}
      </div>
    </div>
  );
}
