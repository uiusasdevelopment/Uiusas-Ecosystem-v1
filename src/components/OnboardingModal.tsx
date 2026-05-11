'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, BookOpen, Target, Check, ChevronRight, Cpu, User } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { UiusasLogo } from './UiusasLogo';

interface OnboardingModalProps {
  isOpen: boolean;
  userId: string;
  onComplete: (display_name: string, nivel: string, activeSubjects: string[]) => void;
}

const PERIODS = Array.from({ length: 12 }, (_, i) => `P${i + 1}`);

export function OnboardingModal({ isOpen, userId, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState('P1');
  const [availableSubjects, setAvailableSubjects] = useState<{name: string, period: string}[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [filterPeriod, setFilterPeriod] = useState('P1');
  const [displayName, setDisplayName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSubjects();
    }
  }, [isOpen]);

  const fetchSubjects = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('quiz_subjects').select('name, period').order('name');
    if (data) {
      setAvailableSubjects(data);
    }
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subject) 
        ? prev.filter(s => s !== subject) 
        : [...prev, subject]
    );
  };

  const checkNameAvailability = async () => {
    if (!displayName.trim()) return;
    
    setIsCheckingName(true);
    setNameError('');
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('users_profile')
      .select('display_name')
      .ilike('display_name', displayName.trim())
      .maybeSingle();

    if (data) {
      setNameError('ESTE CODINOME JÁ ESTÁ EM USO POR OUTRO OPERADOR.');
      setIsCheckingName(false);
      return false;
    }
    
    setIsCheckingName(false);
    setStep(2);
    return true;
  };

  const handleFinish = async () => {
    setIsSaving(true);
    const supabase = createClient();
    
    const { error } = await supabase
      .from('users_profile')
      .update({
        display_name: displayName.trim(),
        nivel: selectedPeriod,
        active_subjects: selectedSubjects,
        onboarding_complete: true
      })
      .eq('id', userId);

    if (error) {
      if (error.code === '23505') {
        setNameError('ESTE CODINOME JÁ FOI REIVINDICADO POR OUTRO OPERADOR.');
        setStep(1);
      } else {
        alert("Erro ao finalizar alistamento: " + error.message);
      }
    } else {
      onComplete(displayName, selectedPeriod, selectedSubjects);
    }
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md font-mono">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-zinc-950 border border-white/10 p-10 relative overflow-hidden shadow-[0_0_80px_rgba(34,211,238,0.1)] rounded-[2.5rem]"
      >
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-500/5 blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-5 mb-10">
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
              <UiusasLogo className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-[0.2em] text-white uppercase">
                Alistamento
              </h2>
              <p className="text-[10px] text-zinc-500 tracking-[0.3em] uppercase">Sincronização de Perfil // V1.0</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h3 className="text-sm font-bold text-cyan-400 tracking-widest mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" /> 01. IDENTIFICAÇÃO DO OPERADOR
                  </h3>
                  <p className="text-xs text-zinc-400 mb-4">Como você deseja ser chamado na plataforma?</p>
                  
                  <input 
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setNameError('');
                    }}
                    placeholder="DIGITE SEU CODINOME..."
                    className={`w-full bg-white/5 border rounded-2xl p-5 text-white text-sm focus:outline-none transition-all placeholder:text-zinc-700 ${nameError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-cyan-500/50'}`}
                  />
                  {nameError && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[9px] text-red-500 font-bold mt-2 tracking-widest uppercase"
                    >
                      {nameError}
                    </motion.p>
                  )}
                </div>

                <button 
                  disabled={!displayName.trim() || isCheckingName}
                  onClick={checkNameAvailability}
                  className="mt-4 flex items-center justify-center gap-2 py-5 bg-cyan-500 text-black rounded-2xl text-xs font-black tracking-widest hover:bg-cyan-400 transition-all group disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(34,211,238,0.2)]"
                >
                  {isCheckingName ? 'VERIFICANDO DISPONIBILIDADE...' : 'PRÓXIMA ETAPA'} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ) : step === 2 ? (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h3 className="text-sm font-bold text-emerald-400 tracking-widest mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" /> 02. SELECIONE SEU PERÍODO ATUAL
                  </h3>
                  <p className="text-xs text-zinc-400 mb-4">Em qual fase da graduação você se encontra?</p>
                  
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {PERIODS.map(p => (
                      <button
                        key={p}
                        onClick={() => setSelectedPeriod(p)}
                        className={`py-4 rounded-xl border text-xs font-bold transition-all ${selectedPeriod === p ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'border-white/5 text-zinc-500 hover:border-white/20'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setStep(1)}
                      className="flex-1 py-5 border border-white/10 rounded-2xl text-zinc-500 text-xs font-bold tracking-widest hover:bg-white/5 transition-all"
                    >
                      VOLTAR
                    </button>
                    <button 
                      onClick={() => setStep(3)}
                      className="flex-[2] py-5 bg-cyan-500 text-black rounded-2xl text-xs font-black tracking-widest hover:bg-cyan-400 transition-all group shadow-[0_10px_30px_rgba(34,211,238,0.2)]"
                    >
                      CONTINUAR
                    </button>
                  </div>
              </motion.div>
            ) : (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-fuchsia-400 tracking-widest flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> 03. CADEIRAS ATIVAS
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-zinc-600 font-bold uppercase">Filtrar:</span>
                      <select 
                        value={filterPeriod} 
                        onChange={(e) => setFilterPeriod(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[9px] text-zinc-400 focus:outline-none focus:border-fuchsia-500/50"
                      >
                        <option value="ALL">TODAS</option>
                        {Array.from({ length: 12 }, (_, i) => `P${i + 1}`).map(p => (
                          <option key={p} value={p} className="bg-zinc-950">{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 mb-4">Quais matérias você está cursando agora? Isso filtrará seu Dashboard.</p>
                  
                  <div className="max-h-[250px] overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-2">
                    {availableSubjects.filter(s => filterPeriod === 'ALL' || s.period === filterPeriod).length > 0 ? (
                      availableSubjects
                        .filter(s => filterPeriod === 'ALL' || s.period === filterPeriod)
                        .map(s => {
                          const isSelected = selectedSubjects.includes(s.name);
                          return (
                            <button
                              key={s.name}
                              onClick={() => toggleSubject(s.name)}
                              className={`p-3 rounded-xl border text-[10px] font-bold text-left transition-all flex items-center justify-between ${isSelected ? 'bg-fuchsia-950/30 border-fuchsia-500 text-fuchsia-400' : 'border-white/10 text-zinc-500 hover:border-white/30'}`}
                            >
                              <div className="flex flex-col">
                                <span className="uppercase">{s.name}</span>
                                <span className="text-[8px] text-zinc-600 font-normal uppercase tracking-tighter">{s.period}</span>
                              </div>
                              {isSelected && <Check className="w-3 h-3" />}
                            </button>
                          );
                        })
                    ) : (
                      <div className="col-span-2 py-8 border border-dashed border-white/10 text-center text-zinc-600 text-xs italic">
                        Nenhuma cadeira encontrada no banco. Continue para configurar depois.
                      </div>
                    )}
                  </div>
                </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setStep(2)}
                      className="flex-1 py-5 border border-white/10 rounded-2xl text-zinc-500 text-xs font-bold tracking-widest hover:bg-white/5 transition-all"
                    >
                      VOLTAR
                    </button>
                    <button 
                      onClick={handleFinish}
                      disabled={isSaving}
                      className="flex-[2] py-5 bg-fuchsia-600 text-white rounded-2xl text-xs font-black tracking-widest hover:bg-fuchsia-500 transition-all shadow-[0_10px_30px_rgba(217,70,239,0.2)] disabled:opacity-50"
                    >
                      {isSaving ? 'SINCRONIZANDO...' : 'FINALIZAR PROTOCOLO'}
                    </button>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status Bar */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
          <motion.div 
            className="h-full bg-cyan-500"
            initial={{ width: '0%' }}
            animate={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
          />
        </div>
      </motion.div>
    </div>
  );
}
