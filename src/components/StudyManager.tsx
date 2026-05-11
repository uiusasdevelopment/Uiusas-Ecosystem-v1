'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, BookOpen, Trash2, Target, CheckCircle, Clock, ChevronRight, Loader2, Play } from 'lucide-react';
import { UserProfile } from '@/app/page';

interface StudyManagerProps {
  userProfile: UserProfile | null;
  type: 'ERRORS' | 'REVIEWS';
  onStartSimulation: (ids: string[], title?: string, subject?: string, id?: string) => void;
}

interface QuestionItem {
  id: string;
  subject: string;
  topic: string;
  question_text: string;
  difficulty: string;
}

export function StudyManager({ userProfile, type, onStartSimulation }: StudyManagerProps) {
  const [items, setItems] = useState<QuestionItem[]>([]);
  const [incompleteSimulations, setIncompleteSimulations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchItems();
  }, [userProfile, type]);

  const fetchItems = async () => {
    setLoading(true);
    
    if (userProfile?.id) {
      const table = type === 'ERRORS' ? 'quiz_user_errors' : 'quiz_user_reviews';
      
      // Buscar questões individuais
      const { data: qData } = await supabase
        .from(table)
        .select(`
          question_id,
          quiz_questions (id, subject, topic, question_text, difficulty)
        `)
        .eq('user_id', userProfile?.id);

      if (qData) {
        const formatted = qData.map((d: any) => d.quiz_questions).filter(Boolean);
        setItems(formatted);
      }

      // Se for REVIEWS, buscar simulados não concluídos
      if (type === 'REVIEWS') {
        const { data: sData } = await supabase
          .from('quiz_simulation_progress')
          .select(`
            *,
            quiz_simulations (title, subject)
          `)
          .eq('user_id', userProfile?.id)
          .eq('completed', false);
        
        if (sData) setIncompleteSimulations(sData);
      }
    } else {
      // GUEST MODE
      const storageKey = type === 'ERRORS' ? 'uiusas_guest_errors' : 'uiusas_guest_reviews';
      const localIdsRaw = localStorage.getItem(storageKey);
      const localIds: string[] = localIdsRaw ? JSON.parse(localIdsRaw) : [];
      
      if (localIds.length > 0) {
        const { data: qData } = await supabase
          .from('quiz_questions')
          .select('id, subject, topic, question_text, difficulty')
          .in('id', localIds);
          
        if (qData) setItems(qData);
      }

      if (type === 'REVIEWS') {
        const guestSims: any[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('uiusas_guest_prog_')) {
            try {
              const raw = localStorage.getItem(key);
              if (!raw) continue;
              const prog = JSON.parse(raw);
              if (prog && !prog.completed) {
                // Tentar buscar detalhes do simulado no Supabase para exibir título bonito
                let simDetail = null;
                if (prog.simulation_id && !prog.simulation_id.startsWith('custom_')) {
                  const { data } = await supabase
                    .from('quiz_simulations')
                    .select('title, subject')
                    .eq('id', prog.simulation_id)
                    .single();
                  simDetail = data;
                }
                
                guestSims.push({
                  ...prog,
                  quiz_simulations: simDetail || { title: "Simulado Personalizado", subject: "Treino" }
                });
              }
            } catch (e) { console.error("Erro parse guest prog", e); }
          }
        }
        setIncompleteSimulations(guestSims);
      }
    }

    setLoading(false);
  };

  const deleteProgress = async (simId: string) => {
    if (!confirm("Deseja apagar o progresso deste simulado?")) return;
    
    if (userProfile?.id) {
      const { error } = await supabase
        .from('quiz_simulation_progress')
        .delete()
        .eq('user_id', userProfile?.id)
        .eq('simulation_id', simId);
      
      if (!error) {
        setIncompleteSimulations(prev => prev.filter(s => s.simulation_id !== simId));
      }
    } else {
      // GUEST MODE
      localStorage.removeItem(`uiusas_guest_prog_${simId}`);
      setIncompleteSimulations(prev => prev.filter(s => s.simulation_id !== simId));
    }
  };

  const handleContinue = async (sim: any) => {
    if (userProfile?.id) {
      // Buscar os IDs das questões desse simulado no Banco
      const { data } = await supabase
        .from('quiz_simulation_questions')
        .select('question_id')
        .eq('simulation_id', sim.simulation_id)
        .order('question_order', { ascending: true });
      
      if (data && data.length > 0) {
        onStartSimulation(
          data.map(d => d.question_id), 
          sim.quiz_simulations?.title, 
          sim.quiz_simulations?.subject, 
          sim.simulation_id
        );
      }
    } else {
      // GUEST MODE: Pegar IDs do objeto salvo (que agora incluímos)
      if (sim.question_ids && sim.question_ids.length > 0) {
        onStartSimulation(
          sim.question_ids,
          sim.quiz_simulations?.title,
          sim.quiz_simulations?.subject,
          sim.simulation_id
        );
      } else {
        // Fallback para simulados oficiais se não tiver IDs salvos no objeto
        const { data } = await supabase
          .from('quiz_simulation_questions')
          .select('question_id')
          .eq('simulation_id', sim.simulation_id)
          .order('question_order', { ascending: true });
        
        if (data && data.length > 0) {
          onStartSimulation(
            data.map(d => d.question_id), 
            sim.quiz_simulations?.title, 
            sim.quiz_simulations?.subject, 
            sim.simulation_id
          );
        }
      }
    }
  };

  const removeItem = async (qid: string) => {
    const table = type === 'ERRORS' ? 'quiz_user_errors' : 'quiz_user_reviews';
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', userProfile?.id)
      .eq('question_id', qid);

    if (!error) {
      setItems(prev => prev.filter(i => i.id !== qid));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        <span className="text-xs text-zinc-500 tracking-widest">SINCRONIZANDO BANCO...</span>
      </div>
    );
  }

  if (items.length === 0 && incompleteSimulations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 bg-black/40 rounded-xl">
        {type === 'ERRORS' ? (
          <CheckCircle className="w-12 h-12 text-emerald-500/30 mb-4" />
        ) : (
          <Clock className="w-12 h-12 text-zinc-500/30 mb-4" />
        )}
        <h3 className="text-sm font-bold text-zinc-400 tracking-widest">
          {type === 'ERRORS' ? 'CADERNO LIMPO' : 'SEM REVISÕES PENDENTES'}
        </h3>
        <p className="text-[10px] text-zinc-500 mt-2 text-center max-w-xs px-6 uppercase leading-relaxed">
          {type === 'ERRORS' 
            ? 'VOCÊ NÃO POSSUI REGISTROS DE FALHA NO MOMENTO. CONTINUE ASSIM!' 
            : 'MARQUE QUESTÕES PARA REVISÃO DURANTE OS SIMULADOS PARA QUE ELAS APAREÇAM AQUI.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
      
      {/* SEÇÃO DE SIMULADOS EM ANDAMENTO (Só em REVIEWS) */}
      {type === 'REVIEWS' && incompleteSimulations.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-[10px] font-black text-cyan-400 tracking-[0.2em] uppercase">Simulados em Andamento</h3>
            <div className="flex-1 h-[1px] bg-cyan-500/20" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {incompleteSimulations.map(sim => (
                <motion.div 
                  key={sim.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-black/60 border border-cyan-500/20 p-5 rounded-2xl flex flex-col gap-4 group hover:border-cyan-500/40 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <h4 className="text-sm font-bold text-white tracking-wide">{sim.quiz_simulations?.title}</h4>
                      <span className="text-[9px] text-cyan-500/60 font-black tracking-widest uppercase mt-1">{sim.quiz_simulations?.subject}</span>
                    </div>
                    <button 
                      onClick={() => deleteProgress(sim.simulation_id)}
                      className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-col gap-1.5 flex-1 pr-6">
                      <div className="flex justify-between items-center text-[8px] font-black text-zinc-500 tracking-widest uppercase">
                        <span>Progresso</span>
                        <span>Questão {sim.current_index + 1}</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 w-[40%] shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleContinue(sim)}
                      className="px-5 py-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-[9px] font-black text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all uppercase tracking-widest"
                    >
                      Continuar
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* SEÇÃO DE QUESTÕES INDIVIDUAIS */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 px-2">
          {type === 'ERRORS' ? <AlertTriangle className="w-4 h-4 text-fuchsia-400" /> : <BookOpen className="w-4 h-4 text-emerald-400" />}
          <h3 className={`text-[10px] font-black tracking-[0.2em] uppercase ${type === 'ERRORS' ? 'text-fuchsia-400' : 'text-emerald-400'}`}>
            {type === 'ERRORS' ? 'Caderno de Erros' : 'Questões para Revisão'}
          </h3>
          <div className={`flex-1 h-[1px] ${type === 'ERRORS' ? 'bg-fuchsia-500/20' : 'bg-emerald-500/20'}`} />
          {items.length > 0 && (
            <button 
              onClick={() => onStartSimulation(items.map(i => i.id), type === 'ERRORS' ? 'REVISÃO DE ERROS' : 'REVISÃO PERSONALIZADA', 'DIVERSOS')}
              className={`px-4 py-1.5 rounded-lg text-[8px] font-black tracking-widest uppercase transition-all ${type === 'ERRORS' ? 'bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500 hover:text-black' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black'}`}
            >
              Simular Tudo
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence>
            {items.map((item, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={item.id}
                className="group flex flex-col md:flex-row items-center gap-4 bg-black/40 border border-white/5 p-4 rounded-xl hover:border-white/20 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] px-2 py-0.5 bg-white/5 border border-white/10 text-zinc-400 tracking-widest font-bold uppercase">{item.subject}</span>
                    <span className="text-[8px] text-zinc-500 uppercase">{item.topic}</span>
                  </div>
                  <p className="text-xs text-zinc-300 line-clamp-1 group-hover:line-clamp-none transition-all">{item.question_text}</p>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                    title="Remover deste caderno"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onStartSimulation([item.id], 'REVISÃO INDIVIDUAL', item.subject)}
                    className="p-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
