'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Target, Clock, Heart, ArrowRight, ArrowLeft, Check, X, Menu, Printer, AlertTriangle, Lightbulb, ChevronDown, ChevronUp, ShieldAlert, Zap, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '@/app/page';

interface SimulatorEngineProps {
  questionIds: string[];
  userProfile: UserProfile | null;
  onExit: () => void;
  simulationTitle?: string;
  simulationSubject?: string;
  simulationId?: string;
}

interface Question {
  id: string;
  subject: string;
  topic: string;
  question_text: string;
  options: string[];
  correct_answer: any;
  hint: string;
  justification: string;
  difficulty: string;
  type?: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
}

export function SimulatorEngine({ 
  questionIds, 
  userProfile, 
  onExit,
  simulationTitle,
  simulationSubject,
  simulationId
}: SimulatorEngineProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<'CONFIG' | 'PLAYING' | 'RESULTS'>('CONFIG');

  // Configs
  const [mode, setMode] = useState<'TRAINING' | 'SURVIVAL'>('TRAINING');
  const [lives, setLives] = useState(3);
  
  // Gameplay State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tempAnswer, setTempAnswer] = useState<number | string | null>(null);
  const [vfSelections, setVfSelections] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, number | string>>({}); // index -> option selected
  const [results, setResults] = useState<Record<number, boolean>>({}); // index -> isCorrect
  const [showExplanation, setShowExplanation] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Results State
  const [showErrorReview, setShowErrorReview] = useState(false);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [savedProgress, setSavedProgress] = useState<any>(null);
  const [checkingProgress, setCheckingProgress] = useState(false);

  const supabase = createClient();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (phase === 'PLAYING') {
      saveProgress();
    }
  }, [currentIndex, answers, results, lives]);

  useEffect(() => {
    fetchQuestions();
    if (simulationId) {
      checkExistingProgress();
    }
  }, [questionIds, simulationId, userProfile?.id]);

  const checkExistingProgress = async () => {
    setCheckingProgress(true);
    if (userProfile?.id) {
      const { data } = await supabase
        .from('quiz_simulation_progress')
        .select('*')
        .eq('user_id', userProfile?.id)
        .eq('simulation_id', simulationId)
        .eq('completed', false)
        .single();
      
      if (data) {
        setSavedProgress(data);
      }
    } else {
      // GUEST MODE: Check Local Storage
      const localProg = localStorage.getItem(`uiusas_guest_prog_${simulationId}`);
      if (localProg) {
        const data = JSON.parse(localProg);
        if (!data.completed) {
          setSavedProgress(data);
        }
      }
    }
    setCheckingProgress(false);
  };

  const resumeSimulation = () => {
    if (!savedProgress) return;
    setAnswers(savedProgress.answers || {});
    setResults(savedProgress.results || {});
    setCurrentIndex(savedProgress.current_index || 0);
    setTimeElapsed(savedProgress.time_elapsed || 0);
    setLives(savedProgress.lives || 3);
    setMode(savedProgress.mode || 'TRAINING');
    setPhase('PLAYING');
    
    // Reset VF if needed
    const q = questions[savedProgress.current_index || 0];
    if (q?.type === 'TRUE_FALSE') {
      const saved = savedProgress.answers[savedProgress.current_index || 0];
      if (saved && typeof saved === 'string') {
        setVfSelections(saved.split(''));
      }
    }
  };

  const saveProgress = async (completed = false) => {
    if (!simulationId || phase !== 'PLAYING') return;

    const correctCount = Object.values(results).filter(Boolean).length;
    const scorePerc = (correctCount / questions.length) * 100;

    if (userProfile?.id) {
      await supabase.from('quiz_simulation_progress').upsert({
        user_id: userProfile.id,
        simulation_id: simulationId,
        current_index: currentIndex,
        answers,
        results,
        time_elapsed: timeElapsed,
        lives,
        mode,
        completed,
        score_percentage: scorePerc,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,simulation_id' });
    } else {
      // GUEST PROGRESS PERSISTENCE
      const guestProgress = {
        simulation_id: simulationId,
        current_index: currentIndex,
        answers,
        results,
        time_elapsed: timeElapsed,
        lives,
        mode,
        completed,
        score_percentage: scorePerc,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(`uiusas_guest_prog_${simulationId}`, JSON.stringify(guestProgress));
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .in('id', questionIds);
    
    if (data) {
      setQuestions(data);
    }
    setLoading(false);
  };

  const startSimulation = () => {
    setPhase('PLAYING');
    setCurrentIndex(0);
    setAnswers({});
    setResults({});
    setTempAnswer(null);
    setShowExplanation(false);
    setTimeElapsed(0);
    setLives(mode === 'SURVIVAL' ? 3 : 999);
    
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const finishSimulation = async () => {
    stopTimer();
    setPhase('RESULTS');
    if (simulationId) {
      await saveProgress(true);
    }

    if (userProfile?.id) {
      const correctCount = Object.values(results).filter(Boolean).length;
      
      await supabase.from('quiz_history').insert({
        user_id: userProfile.id,
        score_correct: correctCount,
        score_total: questions.length,
        time_spent_seconds: timeElapsed,
        lives_remaining: mode === 'SURVIVAL' ? lives : null
      });

      const wrongIds = questions
        .filter((_, idx) => results[idx] === false)
        .map(q => q.id);

      if (wrongIds.length > 0) {
        const errorRows = wrongIds.map(qid => ({
          user_id: userProfile.id,
          question_id: qid
        }));
        await supabase.from('quiz_user_errors').upsert(errorRows, { onConflict: 'user_id,question_id' });
      }

      // Update Points and Streak
      const { data: currentProfile } = await supabase.from('users_profile').select('total_points, last_study_at, current_streak').eq('id', userProfile.id).single();
      if (currentProfile) {
        const pointsEarned = correctCount * 10;
        const newPoints = (currentProfile.total_points || 0) + pointsEarned;
        
        const lastStudyDate = currentProfile.last_study_at ? new Date(currentProfile.last_study_at).toDateString() : null;
        const todayDate = new Date().toDateString();
        
        let newStreak = currentProfile.current_streak || 0;
        if (lastStudyDate !== todayDate) {
          newStreak += 1;
        }

        await supabase.from('users_profile').update({
          total_points: newPoints,
          current_streak: newStreak,
          last_study_at: new Date().toISOString()
        }).eq('id', userProfile.id);
      }
    } else {
      // GUEST MODE: Local Persistence
      const correctCount = Object.values(results).filter(Boolean).length;
      const wrongIds = questions
        .filter((_, idx) => results[idx] === false)
        .map(q => q.id);

      // 1. Save general stats
      const guestStatsRaw = localStorage.getItem('uiusas_guest_stats');
      const guestStats = guestStatsRaw ? JSON.parse(guestStatsRaw) : { total_points: 0, sessions: 0, correct: 0, total: 0 };
      
      guestStats.correct += correctCount;
      guestStats.total += questions.length;
      guestStats.sessions += 1;
      guestStats.total_points += (correctCount * 10);
      localStorage.setItem('uiusas_guest_stats', JSON.stringify(guestStats));

      // Limpar progresso temporário deste simulado
      localStorage.removeItem(`uiusas_guest_prog_${simulationId}`);

      // 2. Save errors
      if (wrongIds.length > 0) {
        const guestErrorsRaw = localStorage.getItem('uiusas_guest_errors');
        let guestErrors: string[] = guestErrorsRaw ? JSON.parse(guestErrorsRaw) : [];
        const newErrors = [...new Set([...guestErrors, ...wrongIds])];
        localStorage.setItem('uiusas_guest_errors', JSON.stringify(newErrors));
      }
    }
  };

  const handleOptionClick = (idx: number) => {
    if (results[currentIndex] !== undefined) return;
    setTempAnswer(idx);
  };

  const handleVfClick = (itemIdx: number, val: 'V' | 'F') => {
    if (results[currentIndex] !== undefined) return;
    const newSelections = [...vfSelections];
    newSelections[itemIdx] = val;
    setVfSelections(newSelections);
    
    // Se preencheu todos os itens disponíveis, ativa a confirmação
    const q = questions[currentIndex];
    const totalItems = q.options.filter(o => o && o.trim() !== '').length;
    if (newSelections.filter((s, i) => i < totalItems && s !== '').length === totalItems) {
      setTempAnswer('VF_COMPLETE'); // Valor flag para habilitar o botão
    }
  };

  const confirmAnswer = () => {
    if (tempAnswer === null || results[currentIndex] !== undefined) return;

    const q = questions[currentIndex];
    let isCorrect = false;
    let finalAnswer: string | number = '';

    if (q.type === 'TRUE_FALSE') {
      finalAnswer = vfSelections.join('');
      isCorrect = finalAnswer === q.correct_answer;
    } else {
      finalAnswer = tempAnswer as number;
      isCorrect = String(finalAnswer) === String(q.correct_answer);
    }
    
    setAnswers(prev => ({ ...prev, [currentIndex]: finalAnswer }));
    setResults(prev => ({ ...prev, [currentIndex]: isCorrect }));

    if (!isCorrect && mode === 'SURVIVAL') {
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        setTimeout(() => finishSimulation(), 2000);
      }
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      const nextAns = answers[nextIdx];
      
      if (questions[nextIdx].type === 'TRUE_FALSE') {
        setVfSelections(typeof nextAns === 'string' ? nextAns.split('') : new Array(questions[nextIdx].options.length).fill(''));
        setTempAnswer(nextAns ? 'VF_COMPLETE' : null);
      } else {
        setTempAnswer(typeof nextAns === 'number' ? nextAns : null);
      }

      setCurrentIndex(nextIdx);
      setShowExplanation(false);
    } else {
      finishSimulation();
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      const prevAns = answers[prevIdx];
      
      if (questions[prevIdx].type === 'TRUE_FALSE') {
        setVfSelections(typeof prevAns === 'string' ? prevAns.split('') : []);
        setTempAnswer(prevAns ? 999 : null);
      } else {
        setTempAnswer(typeof prevAns === 'number' ? prevAns : null);
      }
      setShowExplanation(false);
    }
  };

  const jumpToQuestion = (idx: number) => {
    const targetAns = answers[idx];
    if (questions[idx].type === 'TRUE_FALSE') {
      setVfSelections(typeof targetAns === 'string' ? targetAns.split('') : new Array(questions[idx].options.length).fill(''));
      setTempAnswer(targetAns ? 'VF_COMPLETE' : null);
    } else {
      setTempAnswer(typeof targetAns === 'number' ? targetAns : null);
    }
    
    setCurrentIndex(idx);
    setShowExplanation(false);
    setDrawerOpen(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const generatePDF = () => {
    const w = window.open('', '_blank');
    if (!w) { alert('Popup bloqueado. Permita popups para gerar o PDF.'); return; }
    const db = (d: string) => d==='Difícil'?'background:linear-gradient(135deg,#be123c,#e11d48);color:#fff;':d==='Média'?'background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;':'background:linear-gradient(135deg,#0284c7,#38bdf8);color:#fff;';
    const qh = questions.map((q, i) => {
      const opts = q.options.filter(o => o && o.trim() !== '');
      return '<div style="break-inside:avoid;background:#fff;border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:1px solid #e5e7eb;">'
        +'<div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap;">'
        +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:900;font-size:14px;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;">'+(i+1)+'</div>'
        +'<span style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;background:#f3f4f6;color:#374151;padding:4px 10px;border-radius:6px;border:1px solid #e5e7eb;">'+q.subject+'</span>'
        +'<span style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:#f0fdf4;color:#166534;padding:4px 10px;border-radius:6px;border:1px solid #bbf7d0;">'+q.topic+'</span>'
        +'<span style="font-size:9px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:4px 10px;border-radius:6px;'+db(q.difficulty)+'">'+q.difficulty+'</span>'
        +'</div>'
        +'<p style="font-size:14px;line-height:1.75;color:#1f2937;margin:0 0 16px 0;">'+q.question_text+'</p>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
        +opts.map((o,j) => '<div style="display:flex;align-items:flex-start;gap:8px;font-size:12px;padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;line-height:1.5;"><span style="font-weight:800;color:#6b7280;min-width:20px;">'+['A','B','C','D','E'][j]+')</span><span style="color:#374151;">'+o+'</span></div>').join('')
        +'</div></div>';
    }).join('');
    const gh = questions.map((q, i) => {
      const jp = (q.justification||'').split('|').filter(Boolean);
      return '<div style="break-inside:avoid;background:#fff;border-radius:12px;padding:16px 20px;margin-bottom:12px;border:1px solid #e5e7eb;display:flex;gap:16px;align-items:flex-start;">'
        +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:900;font-size:12px;min-width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;">'+(i+1)+'</div>'
        +'<div style="flex:1;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">'
        +'<span style="font-size:12px;font-weight:700;color:#374151;">Resposta:</span>'
        +'<span style="background:#059669;color:#fff;font-weight:900;font-size:13px;padding:2px 12px;border-radius:6px;letter-spacing:2px;">'+['A','B','C','D','E'][q.correct_answer]+'</span>'
        +'<span style="font-size:10px;color:#9ca3af;">'+q.topic+'</span>'
        +'</div>'+(jp.length?'<p style="font-size:11px;color:#6b7280;line-height:1.6;margin:4px 0 0;border-left:3px solid #d1d5db;padding-left:10px;">'+jp.join(' ')+'</p>':'')+'</div></div>';
    }).join('');
    const nome = userProfile?.display_name?.toUpperCase() || 'VISITANTE';
    const dt = new Date().toLocaleDateString('pt-BR');
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Simulado UIUSAS</title>'
      +'<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">'
      +'<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Inter,Arial,sans-serif;background:#f8fafc;}@media print{body{background:#fff;}}@page{margin:15mm;}</style>'
      +'</head><body>'
      +'<div style="background:linear-gradient(135deg,#064e3b,#059669,#0d9488);border-radius:20px;padding:40px 32px;margin-bottom:32px;color:#fff;position:relative;overflow:hidden;">'
      +'<div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>'
      +'<div style="position:absolute;bottom:-30px;left:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>'
      +'<div style="position:relative;z-index:1;">'
      +'<div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;opacity:0.7;margin-bottom:8px;">Material de Estudo Offline</div>'
      +'<h1 style="font-size:28px;font-weight:900;letter-spacing:2px;margin-bottom:4px;">SIMULADO</h1>'
      +'<h2 style="font-size:14px;font-weight:600;letter-spacing:3px;opacity:0.8;">UIUSAS ECOSYSTEM</h2>'
      +'<div style="display:flex;gap:24px;margin-top:24px;flex-wrap:wrap;">'
      +'<div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 16px;"><div style="font-size:9px;letter-spacing:2px;opacity:0.7;margin-bottom:2px;">DATA</div><div style="font-size:14px;font-weight:700;">'+dt+'</div></div>'
      +'<div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 16px;"><div style="font-size:9px;letter-spacing:2px;opacity:0.7;margin-bottom:2px;">QUESTÕES</div><div style="font-size:14px;font-weight:700;">'+questions.length+'</div></div>'
      +'<div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 16px;"><div style="font-size:9px;letter-spacing:2px;opacity:0.7;margin-bottom:2px;">ESTUDANTE</div><div style="font-size:14px;font-weight:700;">'+nome+'</div></div>'
      +'</div></div></div>'
      +qh
      +'<div style="break-before:page;">'
      +'<div style="background:linear-gradient(135deg,#064e3b,#059669);border-radius:16px;padding:24px 28px;margin-bottom:24px;color:#fff;">'
      +'<div style="font-size:9px;letter-spacing:3px;opacity:0.7;margin-bottom:4px;">SEÇÃO CONFIDENCIAL</div>'
      +'<h2 style="font-size:20px;font-weight:900;letter-spacing:2px;">GABARITO & JUSTIFICATIVAS</h2></div>'
      +gh
      +'<div style="text-align:center;margin-top:32px;padding:16px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;letter-spacing:1px;">Gerado pelo UIUSAS Ecosystem • '+dt+'</div>'
      +'</div></body></html>');
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center min-h-[500px]"><Loader2 className="w-12 h-12 text-cyan-500 animate-spin" /></div>;
  }

  if (questions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[500px]">
        <AlertTriangle className="w-16 h-16 text-zinc-500 mb-6" />
        <h2 className="text-zinc-300 font-black tracking-widest text-xl">ERRO NA COMPILAÇÃO</h2>
        <p className="text-zinc-500 text-sm mt-2 max-w-md">Os pacotes de dados selecionados estão corrompidos ou inacessíveis no momento.</p>
        <button onClick={onExit} className="mt-8 px-8 py-3 rounded-full border border-zinc-600 text-zinc-400 hover:bg-zinc-800 text-xs font-bold tracking-widest transition-colors">RETORNAR</button>
      </div>
    );
  }

  // =====================================
  // WRAPPER PRINCIPAL (Fixando o Layout)
  // =====================================
  return (
    <div className="w-full max-w-5xl min-h-[500px] lg:h-full lg:max-h-[85vh] mx-auto bg-black/40 backdrop-blur-3xl border border-white/[0.08] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-500">
      
      {/* Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-500/[0.07] blur-[120px]" />
      </div>

      {/* ═══════ PHASE: CONFIG ═══════ */}
      {phase === 'CONFIG' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10 overflow-y-auto custom-scrollbar scroll-smooth">
          <div className="w-full max-w-md flex flex-col items-center">
            
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.4)] mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
              <Zap className="w-8 h-8 text-white fill-white" />
            </div>
            
            <h2 className="text-2xl font-black text-white tracking-wide mb-1 text-center">
              {simulationTitle || "Sala de Treinamento"}
            </h2>
            {simulationSubject && (
              <span className="text-[10px] font-black text-cyan-400 tracking-[0.2em] uppercase mb-1">
                {simulationSubject}
              </span>
            )}
            <p className="text-sm text-zinc-400 mb-6">{questions.length} questões carregadas</p>

            <div className="w-full space-y-5">
              <div className="flex flex-col gap-3 w-full">
                <span className="text-[10px] text-zinc-500 font-bold tracking-widest text-center">PROTOCOLO DE EXECUÇÃO</span>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setMode('TRAINING')}
                    className={`p-5 rounded-2xl text-[11px] font-bold tracking-wider transition-all flex flex-col items-center gap-3 ${mode === 'TRAINING' ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40 shadow-[0_4px_20px_rgba(34,211,238,0.15)]' : 'bg-white/[0.04] ring-1 ring-white/[0.06] text-zinc-500 hover:bg-white/[0.07]'}`}
                  >
                    <Target className={`w-7 h-7 ${mode === 'TRAINING' ? 'text-cyan-400' : 'text-zinc-600'}`} /> TREINO LIVRE
                  </button>
                  <button 
                    onClick={() => setMode('SURVIVAL')}
                    className={`p-5 rounded-2xl text-[11px] font-bold tracking-wider transition-all flex flex-col items-center gap-3 ${mode === 'SURVIVAL' ? 'bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/40 shadow-[0_4px_20px_rgba(217,70,239,0.15)]' : 'bg-white/[0.04] ring-1 ring-white/[0.06] text-zinc-500 hover:bg-white/[0.07]'}`}
                  >
                    <Heart className={`w-7 h-7 ${mode === 'SURVIVAL' ? 'text-fuchsia-400 fill-fuchsia-400/30' : 'text-zinc-600'}`} /> SOBREVIVÊNCIA
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1 text-center leading-relaxed h-6">
                  {mode === 'TRAINING' ? 'Sem penalidades. Erre e aprenda livremente.' : '3 vidas. Três erros encerram a sessão.'}
                </p>
              </div>

              <button 
                 onClick={generatePDF}
                 className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] text-zinc-400 font-bold tracking-wider text-[11px] hover:bg-white/[0.08] hover:text-zinc-200 transition-all"
              >
                <Printer className="w-4 h-4" /> GERAR PDF PARA ESTUDO OFFLINE
              </button>
            </div>

            <div className="mt-6 flex gap-3 w-full">
              <button onClick={onExit} className="flex-1 py-3.5 rounded-xl ring-1 ring-white/10 bg-transparent text-zinc-500 font-bold tracking-wider text-xs hover:bg-white/5 transition-colors">
                VOLTAR
              </button>
              <button onClick={startSimulation} className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold tracking-wider text-xs hover:shadow-[0_4px_25px_rgba(34,211,238,0.4)] transition-all hover:scale-[1.02]">
                INICIAR TREINO
              </button>
            </div>

            {savedProgress && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  resumeSimulation();
                }}
                className="w-full mt-4 py-4 rounded-xl bg-cyan-500/25 border border-cyan-500/50 text-cyan-400 font-bold tracking-[0.2em] text-[10px] hover:bg-cyan-500/40 transition-all flex flex-col items-center gap-1 animate-pulse relative z-50 cursor-pointer"
              >
                <span>RETOMAR SESSÃO ANTERIOR</span>
                <span className="text-[9px] opacity-60 uppercase">Questão {(savedProgress.current_index || 0) + 1} de {questions.length}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══════ PHASE: PLAYING ═══════ */}
      {phase === 'PLAYING' && (
        <div className="flex-1 flex flex-col relative z-10 w-full h-full">
          {/* HUD Topo */}
          <div className="h-16 bg-black/30 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between px-6 z-20">
            <button onClick={() => setDrawerOpen(!drawerOpen)} className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 ring-1 ring-white/[0.08] text-zinc-300 transition-colors">
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-cyan-300 font-mono tracking-wider bg-cyan-500/10 px-4 py-1.5 rounded-xl ring-1 ring-cyan-500/20">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{formatTime(timeElapsed)}</span>
              </div>
              
              {mode === 'SURVIVAL' && (
                <div className="flex items-center gap-1.5 bg-fuchsia-500/10 px-4 py-1.5 rounded-xl ring-1 ring-fuchsia-500/20">
                  {[1,2,3].map(i => (
                    <Heart key={i} className={`w-4 h-4 ${i <= lives ? 'text-fuchsia-400 fill-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]' : 'text-zinc-800'}`} />
                  ))}
                </div>
              )}
            </div>

            <div className="text-zinc-400 font-mono text-[11px] tracking-wider font-bold bg-white/[0.04] px-4 py-1.5 rounded-xl ring-1 ring-white/[0.06]">
              <span className="text-emerald-400">{currentIndex + 1}</span> / {questions.length}
            </div>
          </div>

          {/* Sidebar Drawer */}
          <AnimatePresence>
            {drawerOpen && (
              <motion.div 
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute top-16 left-0 w-72 h-[calc(100%-4rem)] bg-black/80 backdrop-blur-2xl border-r border-white/[0.08] z-30 flex flex-col rounded-br-3xl"
              >
                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                  <h3 className="text-[10px] text-cyan-400 tracking-widest font-bold mb-6 border-b border-white/10 pb-3 flex items-center gap-2">
                    <Target className="w-3 h-3" /> MAPA DE NAVEGAÇÃO
                  </h3>
                  <div className="grid grid-cols-5 gap-3">
                    {questions.map((_, idx) => {
                      let statusClass = 'bg-white/5 border-white/10 text-zinc-500 hover:border-cyan-500/50 hover:text-cyan-400';
                      if (results[idx] === true) statusClass = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.3)]';
                      if (results[idx] === false) statusClass = 'bg-red-500/20 border-red-500/50 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
                      if (idx === currentIndex) statusClass += ' ring-2 ring-white scale-110 z-10';

                      return (
                        <button 
                          key={idx} 
                          onClick={() => jumpToQuestion(idx)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-[10px] font-bold ring-1 transition-all ${statusClass}`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="p-5 border-t border-white/[0.06] bg-black/40 rounded-br-3xl">
                  <button onClick={finishSimulation} className="w-full py-3 rounded-xl bg-rose-500/10 ring-1 ring-rose-500/25 text-rose-400 text-[10px] font-bold tracking-wider hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5" /> ABORTAR SESSÃO
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Question Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative">
            <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-32">
              
              {/* Cabecalho da Questão */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] text-white font-bold tracking-wider bg-cyan-500/15 ring-1 ring-cyan-500/30 px-3 py-1.5 rounded-lg uppercase">
                    {questions[currentIndex].subject}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-bold tracking-wider bg-white/[0.04] ring-1 ring-white/[0.06] px-3 py-1.5 rounded-lg uppercase">
                    {questions[currentIndex].topic}
                  </span>
                  
                  {/* Dica (ANTES de responder) */}
                  {results[currentIndex] === undefined && questions[currentIndex].hint && (
                    <button 
                      onClick={() => setShowExplanation(!showExplanation)}
                      className="ml-auto flex items-center gap-2 text-[10px] tracking-wider font-bold text-amber-300 hover:text-amber-200 ring-1 ring-amber-500/30 bg-amber-500/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Lightbulb className="w-3 h-3" /> {showExplanation ? 'ESCONDER DICA' : 'VER DICA'}
                    </button>
                  )}
                </div>
                
                {/* Box de Texto da Questão */}
                <div className="p-6 md:p-8 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.05]">
                  <p className="text-base md:text-lg text-zinc-100 font-medium leading-relaxed font-sans text-justify">
                    {questions[currentIndex].question_text}
                  </p>
                </div>
              </div>

              {/* Dica (visível antes de responder) */}
              <AnimatePresence>
                {showExplanation && results[currentIndex] === undefined && questions[currentIndex].hint && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -10 }} 
                    animate={{ opacity: 1, height: 'auto', y: 0 }} 
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="p-5 rounded-2xl ring-1 ring-amber-500/25 bg-amber-500/[0.08] text-amber-100/90 text-sm leading-relaxed overflow-hidden"
                  >
                    <span className="font-bold text-amber-400 text-[10px] tracking-widest block mb-3 flex items-center gap-2 uppercase">
                      <Lightbulb className="w-4 h-4" /> Dica
                    </span>
                    <div className="pl-2 border-l-2 border-amber-500/50">
                      <p>{questions[currentIndex].hint}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Justificativa (visível DEPOIS de responder) */}
              <AnimatePresence>
                {results[currentIndex] !== undefined && questions[currentIndex].justification && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -10 }} 
                    animate={{ opacity: 1, height: 'auto', y: 0 }} 
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className={`p-5 rounded-2xl ring-1 text-sm leading-relaxed overflow-hidden ${results[currentIndex] ? 'ring-emerald-500/25 bg-emerald-500/[0.08] text-emerald-100/90' : 'ring-rose-500/25 bg-rose-500/[0.08] text-rose-100/90'}`}
                  >
                    <span className={`font-bold text-[10px] tracking-widest block mb-3 flex items-center gap-2 uppercase ${results[currentIndex] ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <AlertTriangle className="w-4 h-4" /> Justificativa
                    </span>
                    <div className={`pl-2 border-l-2 ${results[currentIndex] ? 'border-emerald-500/50' : 'border-rose-500/50'}`}>
                      {questions[currentIndex].justification.split('|').map((part, p_idx) => (
                        <p key={p_idx} className={p_idx > 0 ? "mt-3" : ""}>{part}</p>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Questão de Múltipla Escolha vs V/F */}
              <div className="flex flex-col gap-3">
                {questions[currentIndex].type === 'TRUE_FALSE' ? (
                  // MODELO VERDADEIRO OU FALSO
                  <div className="flex flex-col gap-4">
                    <div className="text-[10px] text-zinc-500 font-bold tracking-[0.2em] mb-2 uppercase flex justify-between">
                      <span>ITENS DA QUESTÃO</span>
                      <span>VERDADEIRO OU FALSO</span>
                    </div>
                    {questions[currentIndex].options.map((opt, i) => {
                      const isAnswered = results[currentIndex] !== undefined;
                      const currentVal = vfSelections[i];
                      const correctVal = questions[currentIndex].correct_answer[i];
                      const isWrong = isAnswered && currentVal !== correctVal;

                      return (
                        <div key={i} className={`group relative p-5 rounded-2xl ring-1 transition-all duration-300 flex items-center gap-4 bg-white/[0.02] ${isAnswered ? (isWrong ? 'ring-rose-500/30' : 'ring-emerald-500/30') : 'ring-white/[0.06]'}`}>
                          <div className="w-10 h-10 rounded-xl bg-white/[0.04] ring-1 ring-white/10 flex items-center justify-center shrink-0">
                            <span className="text-zinc-500 font-bold text-xs">{['I', 'II', 'III', 'IV', 'V'][i]}</span>
                          </div>
                          <span className="flex-1 text-sm text-zinc-300 leading-relaxed">{opt}</span>
                          
                          <div className="flex gap-2 shrink-0">
                            {['V', 'F'].map(v => {
                              const isActive = currentVal === v;
                              const isCorrectBtn = isAnswered && correctVal === v;
                              
                              let style = 'bg-white/[0.05] text-zinc-600 border-white/10';
                              if (isAnswered) {
                                if (isCorrectBtn) style = 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]';
                                else if (isActive) style = 'bg-rose-500 text-white border-rose-400 opacity-60';
                                else style = 'bg-black/40 text-zinc-800 border-transparent opacity-20';
                              } else if (isActive) {
                                style = v === 'V' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-rose-500/20 text-rose-400 border-rose-500/50';
                              }

                              return (
                                <button
                                  key={v}
                                  disabled={isAnswered}
                                  onClick={() => handleVfClick(i, v as 'V' | 'F')}
                                  className={`w-10 h-10 rounded-lg border font-black text-xs transition-all ${style}`}
                                >
                                  {v}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Campo de Resposta Final */}
                    <div className="mt-4 p-6 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col items-center gap-3">
                      <span className="text-[10px] text-zinc-500 font-bold tracking-[0.2em] uppercase">SUA RESPOSTA FINAL</span>
                      <div className="text-2xl font-black tracking-[0.5em] text-cyan-400 font-mono">
                        {vfSelections.map((s, i) => (
                          <span key={i} className={s === '' ? 'text-zinc-800' : ''}>{s || '_'}</span>
                        ))}
                      </div>
                      {results[currentIndex] !== undefined && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-zinc-500 font-bold">GABARITO:</span>
                          <span className="text-sm font-black text-emerald-400 tracking-[0.3em] font-mono">{questions[currentIndex].correct_answer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // MODELO MÚLTIPLA ESCOLHA
                  questions[currentIndex].options.filter(o => o && o.trim() !== '').map((opt, i) => {
                    const isSelected = tempAnswer === i || answers[currentIndex] === i || (typeof answers[currentIndex] === 'string' && parseInt(answers[currentIndex]) === i);
                    const isCorrectOpt = String(questions[currentIndex].correct_answer) === String(i);
                    const isAnswered = results[currentIndex] !== undefined;
                    
                    let btnStyle = 'ring-white/[0.08] bg-white/[0.02] text-zinc-400 hover:ring-cyan-500/30 hover:bg-white/[0.05]';
                    
                    if (isAnswered) {
                      if (isCorrectOpt) {
                        btnStyle = 'ring-emerald-500/50 bg-emerald-500/15 text-emerald-100 shadow-[0_0_15px_rgba(52,211,153,0.1)]';
                      } else if (isSelected) {
                        btnStyle = 'ring-rose-500/50 bg-rose-500/15 text-rose-200';
                      } else {
                        btnStyle = 'ring-white/[0.03] bg-black/20 text-zinc-600 opacity-40';
                      }
                    } else if (isSelected) {
                      btnStyle = 'ring-cyan-400/60 bg-cyan-500/15 text-white shadow-[0_0_15px_rgba(34,211,238,0.1)]';
                    }

                    return (
                      <button 
                        key={i} 
                        onClick={() => handleOptionClick(i)}
                        disabled={isAnswered}
                        className={`relative p-4 rounded-2xl text-left ring-1 transition-all duration-300 flex items-center gap-4 ${btnStyle}`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isSelected || (isAnswered && isCorrectOpt) ? 'bg-white/15' : 'bg-white/[0.04] ring-1 ring-white/10'}`}>
                          <span className={`font-bold text-sm tracking-widest ${isSelected && !isAnswered ? 'text-white' : 'opacity-80'}`}>
                            {['A', 'B', 'C', 'D', 'E'][i]}
                          </span>
                        </div>
                        <span className="flex-1 text-sm leading-relaxed">{opt}</span>
                        
                        {isAnswered && isCorrectOpt && <Check className="w-6 h-6 text-emerald-400 shrink-0 drop-shadow-[0_0_5px_rgba(52,211,153,1)]" />}
                        {isAnswered && isSelected && !isCorrectOpt && <X className="w-6 h-6 text-red-400 shrink-0 drop-shadow-[0_0_5px_rgba(239,68,68,1)]" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/90 to-transparent p-5 z-20 flex flex-col gap-3 rounded-b-3xl">
            
            {/* Barra de Confirmação */}
            <AnimatePresence>
              {tempAnswer !== null && results[currentIndex] === undefined && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="w-full flex justify-center mb-2"
                >
                  <button 
                    onClick={confirmAnswer}
                    className="w-full max-w-sm py-3.5 rounded-xl bg-cyan-500 text-black font-black tracking-wider text-xs shadow-[0_4px_25px_rgba(34,211,238,0.4)] hover:bg-cyan-400 hover:scale-[1.03] transition-all animate-pulse"
                  >
                    CONFIRMAR SELEÇÃO
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between max-w-3xl mx-auto w-full">
              <button 
                onClick={prevQuestion}
                disabled={currentIndex === 0}
                className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all ${currentIndex === 0 ? 'text-zinc-800' : 'ring-1 ring-white/15 bg-black/50 text-zinc-300 hover:bg-white/10'}`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <button 
                onClick={nextQuestion}
                disabled={results[currentIndex] === undefined && currentIndex < questions.length}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold tracking-wider text-[11px] transition-all ${results[currentIndex] === undefined ? 'bg-white/[0.03] ring-1 ring-white/[0.05] text-zinc-700' : (currentIndex === questions.length - 1 ? 'bg-emerald-500 text-black shadow-[0_4px_20px_rgba(52,211,153,0.4)] hover:scale-[1.03]' : 'bg-white/[0.07] ring-1 ring-white/15 text-white hover:bg-white/15')}`}
              >
                {currentIndex === questions.length - 1 ? 'FINALIZAR' : 'AVANÇAR'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================
          PHASE: RESULTS
          ===================================== */}
      {phase === 'RESULTS' && (() => {
        const correctCount = Object.values(results).filter(Boolean).length;
        const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

        const diffStats: Record<string, { total: number, correct: number }> = {};
        const topicStats: Record<string, { total: number, correct: number }> = {};

        questions.forEach((q, idx) => {
          const isCorrect = results[idx] === true;
          const d = q.difficulty || 'Indefinido';
          const t = q.topic || 'Indefinido';

          if (!diffStats[d]) diffStats[d] = { total: 0, correct: 0 };
          if (!topicStats[t]) topicStats[t] = { total: 0, correct: 0 };

          diffStats[d].total += 1;
          topicStats[t].total += 1;
          if (isCorrect) {
            diffStats[d].correct += 1;
            topicStats[t].correct += 1;
          }
        });

        const topicEntries = Object.entries(topicStats);

        return (
          <div className="flex-1 flex flex-col items-center overflow-y-auto custom-scrollbar p-6 md:p-10 relative z-10">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-4xl flex flex-col gap-8 pb-10"
            >
              {/* Relatório Geral */}
              <div className="bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/[0.08] rounded-3xl p-8 md:p-10 relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-fuchsia-500 rounded-t-3xl" />
                <h2 className="text-xl font-black text-white tracking-wide mb-8 text-center mt-2">Análise de Desempenho</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 w-full gap-4 border-b border-white/[0.06] pb-8 mb-6">
                  <div className="flex flex-col items-center bg-black/30 rounded-2xl p-6 ring-1 ring-white/[0.04]">
                    <span className="text-[10px] text-cyan-400 tracking-widest font-bold mb-2">PRECISÃO</span>
                    <div className="text-5xl font-black text-white">{accuracy}<span className="text-2xl text-zinc-500">%</span></div>
                  </div>
                  <div className="flex flex-col items-center bg-black/30 rounded-2xl p-6 ring-1 ring-white/[0.04]">
                    <span className="text-[10px] text-zinc-400 tracking-widest font-bold mb-2">ACERTOS</span>
                    <div className="text-4xl font-black text-white">{correctCount}<span className="text-xl text-zinc-600">/{questions.length}</span></div>
                  </div>
                  <div className="flex flex-col items-center bg-black/30 rounded-2xl p-6 ring-1 ring-white/[0.04]">
                    <span className="text-[10px] text-zinc-400 tracking-widest font-bold mb-2">TEMPO</span>
                    <div className="text-3xl font-black text-emerald-400 font-mono">{formatTime(timeElapsed)}</div>
                  </div>
                </div>

                <button 
                   onClick={onExit}
                   className="px-8 py-3 rounded-xl bg-white/[0.07] ring-1 ring-white/15 text-white font-bold tracking-wider text-xs hover:bg-white/15 hover:scale-[1.02] transition-all"
                >
                  CONCLUIR E RETORNAR
                </button>
              </div>

              {/* Breakdown Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Dificuldade */}
                <div className="bg-black/30 ring-1 ring-white/[0.04] rounded-2xl p-6 backdrop-blur-md">
                  <h3 className="text-[11px] text-zinc-300 font-bold tracking-widest mb-6 flex items-center gap-2">
                    <Target className="w-4 h-4 text-fuchsia-400" /> ANÁLISE POR DIFICULDADE
                  </h3>
                  <div className="flex flex-col gap-6">
                    {Object.entries(diffStats).map(([diff, data]) => {
                      const perc = Math.round((data.correct/data.total)*100);
                      return (
                        <div key={diff} className="flex flex-col gap-2">
                          <div className="flex justify-between text-xs font-mono font-medium">
                            <span className="text-zinc-400 uppercase">{diff}</span>
                            <span className="text-white">{data.correct}/{data.total} <span className="text-fuchsia-400 ml-1">({perc}%)</span></span>
                          </div>
                          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-fuchsia-600 to-fuchsia-400 rounded-full" style={{ width: `${perc}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tópicos com Acordeão/Scroll */}
                <div className="bg-black/30 ring-1 ring-white/[0.04] rounded-2xl p-6 backdrop-blur-md flex flex-col max-h-[380px]">
                  <h3 className="text-[11px] text-zinc-300 font-bold tracking-widest mb-6 flex items-center gap-2 shrink-0">
                    <Target className="w-4 h-4 text-cyan-400" /> ANÁLISE POR TÓPICO
                  </h3>
                  <div className={`flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 ${!showAllTopics && topicEntries.length > 5 ? 'fade-out-bottom' : ''}`}>
                    {(showAllTopics ? topicEntries : topicEntries.slice(0, 5)).map(([topic, data]) => {
                      const perc = Math.round((data.correct/data.total)*100);
                      return (
                        <div key={topic} className="flex flex-col gap-2 shrink-0">
                          <div className="flex justify-between text-[10px] font-mono font-medium">
                            <span className="text-zinc-400 truncate pr-4" title={topic}>{topic.toUpperCase()}</span>
                            <span className="text-white shrink-0">{data.correct}/{data.total} <span className="text-cyan-400 ml-1">({perc}%)</span></span>
                          </div>
                          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" style={{ width: `${perc}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {topicEntries.length > 5 && (
                    <button 
                      onClick={() => setShowAllTopics(!showAllTopics)}
                      className="w-full mt-4 py-2 border-t border-white/10 text-[10px] tracking-widest font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex justify-center items-center gap-2 shrink-0"
                    >
                      {showAllTopics ? <><ChevronUp className="w-3 h-3" /> RECOLHER TÓPICOS</> : <><ChevronDown className="w-3 h-3" /> VER TODOS ({topicEntries.length})</>}
                    </button>
                  )}
                </div>
              </div>

              {/* Review de Erros */}
              <div className="bg-rose-500/[0.06] ring-1 ring-rose-500/15 rounded-2xl p-6 backdrop-blur-md mt-4">
                <button 
                  onClick={() => setShowErrorReview(!showErrorReview)}
                  className="w-full flex items-center justify-between text-red-400 font-bold tracking-widest text-xs uppercase"
                >
                  <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> REVISÃO DE DADOS CORROMPIDOS (ERROS)</span>
                  {showErrorReview ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                
                <AnimatePresence>
                  {showErrorReview && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-8 flex flex-col gap-6"
                    >
                      {questions.filter((_, idx) => results[idx] === false).map((q, idx) => {
                        const originalIndex = questions.findIndex(ques => ques.id === q.id);
                        const userAnswerIdx = answers[originalIndex];
                        
                        return (
                          <div key={q.id} className="ring-1 ring-white/[0.06] bg-black/40 rounded-2xl p-5 flex flex-col gap-4">
                            <span className="text-[10px] font-mono text-zinc-500 tracking-widest bg-white/5 self-start px-3 py-1 rounded-full">
                              QUESTÃO {originalIndex + 1} | {q.topic.toUpperCase()}
                            </span>
                            <p className="text-sm text-zinc-200 font-sans leading-relaxed">{q.question_text}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                              <div className="ring-1 ring-rose-500/25 bg-rose-500/[0.08] rounded-xl p-4 flex flex-col gap-2">
                                <span className="text-red-400 font-bold text-[10px] tracking-widest uppercase flex items-center gap-1"><X className="w-3 h-3" /> VOCÊ MARCOU:</span>
                                <span className="text-sm text-red-100">{userAnswerIdx !== undefined ? q.options[userAnswerIdx] : 'NENHUMA (TEMPO/PULO)'}</span>
                              </div>
                              <div className="ring-1 ring-emerald-500/25 bg-emerald-500/[0.08] rounded-xl p-4 flex flex-col gap-2">
                                <span className="text-emerald-400 font-bold text-[10px] tracking-widest uppercase flex items-center gap-1"><Check className="w-3 h-3" /> CORRETA:</span>
                                <span className="text-sm text-emerald-100">{q.options[q.correct_answer]}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {questions.filter((_, idx) => results[idx] === false).length === 0 && (
                        <div className="text-center text-zinc-500 text-xs py-8 font-mono bg-black/40 rounded-2xl border border-white/5">
                          NENHUM DADO CORROMPIDO ENCONTRADO.
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </motion.div>
          </div>
        );
      })()}

      {/* CSS extra para o fade-out se houver muitos tópicos e estiver recolhido */}
      <style dangerouslySetInnerHTML={{__html: `
        .fade-out-bottom {
          -webkit-mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
          mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
        }
      `}} />
    </div>
  );
}
