'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Database, Search, Upload, Target, Trash2, Loader2, AlertTriangle, Eye, EyeOff, Sparkles, Filter, Check, ChevronDown, ChevronUp, Layers, Settings, Book, ArrowLeft, X, ChevronRight, Plus } from 'lucide-react';
import { UserProfile } from '@/app/page';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminSubjectManager } from './AdminSubjectManager';

interface QuestionBankProps {
  userProfile: UserProfile | null;
  isAdmin: boolean;
  onStartSimulation?: (questionIds: string[], title?: string, subject?: string) => void;
  onOpenSimulationManager?: () => void;
}

interface Question {
  id: string;
  subject: string;
  topic: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  difficulty: string;
  created_at: string;
}

export function QuestionBank({ userProfile, isAdmin, onStartSimulation, onOpenSimulationManager }: QuestionBankProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterTopic, setFilterTopic] = useState<string>('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showSubjectManager, setShowSubjectManager] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('quiz_questions').select('*').order('created_at', { ascending: false });
    if (data) setQuestions(data);
    setLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!confirm('Deseja processar este arquivo CSV para o Banco de Dados Mestre?')) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      await processCSV(text);
    };
    reader.readAsText(file);
  };

  const processCSV = async (csvText: string) => {
    const lines = csvText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) { alert("CSV inválido."); setUploading(false); return; }
    const newQuestions = [];
    for (let i = 1; i < lines.length; i++) {
      try {
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        const cols = lines[i].split(regex).map(col => col.replace(/^"|"$/g, '').trim());
        if (cols.length >= 10) {
          newQuestions.push({
            subject: cols[0], topic: cols[1], question_text: cols[2],
            options: [cols[3], cols[4], cols[5], cols[6], cols[7]].filter(o => o && o.trim() !== ''),
            correct_answer: parseInt(cols[8]), justification: cols[9] || '', difficulty: cols[10] || 'Média',
            hint: cols[11] || ''
          });
        }
      } catch (err) { console.error(`Erro linha ${i}:`, err); }
    }
    if (newQuestions.length > 0) {
      const { error } = await supabase.from('quiz_questions').insert(newQuestions);
      if (error) alert("Erro: " + error.message);
      else { alert(`${newQuestions.length} questões inseridas!`); fetchQuestions(); }
    } else { alert("Nenhuma questão válida encontrada."); }
    setUploading(false);
  };

  const startSimulationFromPreset = async (simId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('quiz_simulation_questions')
      .select('question_id')
      .eq('simulation_id', simId)
      .order('question_order', { ascending: true });
    
    if (data && data.length > 0) {
      const { data: simData } = await supabase.from('quiz_simulations').select('title, subject').eq('id', simId).single();
      onStartSimulation?.(data.map(d => d.question_id), simData?.title, simData?.subject);
    } else {
      alert("Este simulado não possui questões vinculadas.");
    }
    setLoading(false);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedQuestions);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedQuestions(newSet);
  };

  const toggleReveal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(revealedAnswers);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setRevealedAnswers(newSet);
  };

  const deleteQuestion = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Deseja purgar este registro permanentemente?')) return;
    const { error } = await supabase.from('quiz_questions').delete().eq('id', id);
    if (!error) {
      fetchQuestions();
      setSelectedQuestions(prev => { const next = new Set(prev); next.delete(id); return next; });
    } else { alert('Falha: ' + error.message); }
  };

  const handleStartSelection = () => {
    if (selectedQuestions.size === 0) return;
    onStartSimulation?.(Array.from(selectedQuestions), "Treinamento Personalizado", filterSubject !== 'ALL' ? filterSubject : "Múltiplas Matérias");
  };

  const deleteSelectedQuestions = async () => {
    if (selectedQuestions.size === 0) return;
    if (!confirm(`Purgar ${selectedQuestions.size} registros permanentemente?`)) return;
    const ids = Array.from(selectedQuestions);
    const { error } = await supabase.from('quiz_questions').delete().in('id', ids);
    if (!error) { fetchQuestions(); setSelectedQuestions(new Set()); }
    else { alert('Falha: ' + error.message); }
  };

  const addSubject = async () => {
    // Moved to AdminSubjectManager
  };
  const generatePDF = () => {
    const w = window.open('', '_blank');
    if (!w) { alert('Popup bloqueado. Permita popups para gerar o PDF.'); return; }
    
    const questionsToExport = selectedQuestions.size > 0 
      ? filteredQuestions.filter(q => selectedQuestions.has(q.id))
      : filteredQuestions;

    const db = (d: string) => d==='Difícil'?'background:linear-gradient(135deg,#be123c,#e11d48);color:#fff;':d==='Média'?'background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;':'background:linear-gradient(135deg,#0284c7,#38bdf8);color:#fff;';
    
    const qh = questionsToExport.map((q, i) => {
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

    const gh = questionsToExport.map((q, i) => {
      return '<div style="break-inside:avoid;background:#fff;border-radius:12px;padding:16px 20px;margin-bottom:12px;border:1px solid #e5e7eb;display:flex;gap:16px;align-items:flex-start;">'
        +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:900;font-size:12px;min-width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;">'+(i+1)+'</div>'
        +'<div style="flex:1;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">'
        +'<span style="font-size:12px;font-weight:700;color:#374151;">Resposta:</span>'
        +'<span style="background:#059669;color:#fff;font-weight:900;font-size:13px;padding:2px 12px;border-radius:6px;letter-spacing:2px;">'+['A','B','C','D','E'][q.correct_answer]+'</span>'
        +'<span style="font-size:10px;color:#9ca3af;">'+q.topic+'</span>'
        +'</div></div></div>';
    }).join('');

    const nome = userProfile?.display_name?.toUpperCase() || 'VISITANTE';
    const dt = new Date().toLocaleDateString('pt-BR');
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Acervo UIUSAS</title>'
      +'<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">'
      +'<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Inter,Arial,sans-serif;background:#f8fafc;-webkit-print-color-adjust:exact;print-color-adjust:exact;}@media print{body{background:#fff;}}@page{margin:15mm;}</style>'
      +'</head><body>'
      +'<div style="background:linear-gradient(135deg,#064e3b,#059669,#0d9488);border-radius:20px;padding:40px 32px;margin-bottom:32px;color:#fff;position:relative;overflow:hidden;">'
      +'<div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>'
      +'<div style="position:relative;z-index:1;">'
      +'<div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;opacity:0.7;margin-bottom:8px;">Acervo de Questões</div>'
      +'<h1 style="font-size:28px;font-weight:900;letter-spacing:2px;margin-bottom:4px;">MATRIZ DE DADOS</h1>'
      +'<div style="display:flex;gap:24px;margin-top:24px;flex-wrap:wrap;">'
      +'<div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 16px;"><div style="font-size:9px;letter-spacing:2px;opacity:0.7;margin-bottom:2px;">EXPORTADO EM</div><div style="font-size:14px;font-weight:700;">'+dt+'</div></div>'
      +'<div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 16px;"><div style="font-size:9px;letter-spacing:2px;opacity:0.7;margin-bottom:2px;">TOTAL</div><div style="font-size:14px;font-weight:700;">'+questionsToExport.length+'</div></div>'
      +'</div></div></div>'
      +qh
      +'<div style="break-before:page;">'
      +'<div style="background:linear-gradient(135deg,#064e3b,#059669);border-radius:16px;padding:24px 28px;margin-bottom:24px;color:#fff;">'
      +'<h2 style="font-size:20px;font-weight:900;letter-spacing:2px;">GABARITO</h2></div>'
      +gh
      +'</div></body></html>');
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  const uniqueSubjects = Array.from(new Set(questions.map(q => q.subject))).sort();
  const filteredTopics = Array.from(new Set(questions.filter(q => filterSubject === 'ALL' || q.subject === filterSubject).map(q => q.topic))).sort();
  const uniqueDifficulties = Array.from(new Set(questions.map(q => q.difficulty))).sort();
  const filteredQuestions = questions.filter(q => {
    return (filterSubject === 'ALL' || q.subject === filterSubject)
      && (filterTopic === 'ALL' || q.topic === filterTopic)
      && (filterDifficulty === 'ALL' || q.difficulty === filterDifficulty);
  });

  const diffColor = (d: string) => d === 'Difícil' ? 'text-rose-400 bg-rose-500/15 border-rose-500/30' : d === 'Média' ? 'text-amber-400 bg-amber-500/15 border-amber-500/30' : 'text-sky-400 bg-sky-500/15 border-sky-500/30';
  const diffDot = (d: string) => d === 'Difícil' ? 'bg-rose-400' : d === 'Média' ? 'bg-amber-400' : 'bg-sky-400';

  return (
    <div className="flex flex-col gap-0 w-full animate-in fade-in duration-500 relative">
      
      {/* ═══════════════ HERO HEADER ═══════════════ */}
      <div className="relative mb-8 overflow-hidden rounded-3xl">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-cyan-600/10 to-fuchsia-600/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(52,211,153,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(34,211,238,0.1),transparent_50%)]" />
        <div className="absolute inset-0 backdrop-blur-3xl bg-black/30" />
        
        <div className="relative z-10 px-8 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-teal-500 flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.4)] rotate-3 hover:rotate-0 transition-transform duration-500">
                <Sparkles className="w-7 h-7 text-white drop-shadow-lg" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center shadow-lg">
                <span className="text-[8px] text-black font-black">{filteredQuestions.length}</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-wide">Matriz de Dados</h1>
              <p className="text-sm text-zinc-400 mt-0.5">{questions.length} questões no banco • {selectedQuestions.size} selecionadas</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Selecionar Todos */}
            <button 
              onClick={() => {
                if (selectedQuestions.size === filteredQuestions.length) setSelectedQuestions(new Set());
                else setSelectedQuestions(new Set(filteredQuestions.map(q => q.id)));
              }}
              className="px-5 py-2.5 rounded-xl text-[11px] font-bold tracking-wider bg-white/[0.07] border border-white/10 text-zinc-300 hover:bg-white/15 hover:text-white transition-all"
            >
              {selectedQuestions.size === filteredQuestions.length && filteredQuestions.length > 0 ? 'DESMARCAR' : 'SELECIONAR TUDO'}
            </button>

            {/* Filtros Toggle */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-5 py-2.5 rounded-xl text-[11px] font-bold tracking-wider flex items-center gap-2 transition-all ${showFilters ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'bg-white/[0.07] border border-white/10 text-zinc-400 hover:text-white'}`}
            >
              <Filter className="w-3.5 h-3.5" /> FILTROS
            </button>

            {/* Exportar PDF */}
            <button 
              onClick={generatePDF}
              className="px-5 py-2.5 rounded-xl text-[11px] font-bold tracking-wider bg-white/[0.07] border border-white/10 text-zinc-400 hover:text-white transition-all flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" /> EXPORTAR PDF
            </button>
            
            {/* Ações de Seleção */}
            <AnimatePresence>
              {selectedQuestions.size > 0 && (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex gap-2">
                  <button 
                    onClick={handleStartSelection}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-[11px] font-bold tracking-wider shadow-[0_4px_20px_rgba(52,211,153,0.3)] hover:shadow-[0_4px_30px_rgba(52,211,153,0.5)] hover:scale-[1.03] transition-all flex items-center gap-2"
                  >
                    <Target className="w-4 h-4" /> TREINAR ({selectedQuestions.size})
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={deleteSelectedQuestions}
                      className="px-5 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-bold tracking-wider hover:bg-rose-500/25 transition-all flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> PURGAR
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ═══════════════ FILTROS (Colapsáveis) ═══════════════ */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0, marginBottom: 0 }} 
            animate={{ height: 'auto', opacity: 1, marginBottom: 24 }} 
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-4 px-2">
              {/* Filter: Matéria */}
              <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                <label className="text-[10px] text-zinc-500 font-bold tracking-widest pl-1 flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-cyan-500" /> MATÉRIA
                </label>
                <select 
                  value={filterSubject} 
                  onChange={(e) => { setFilterSubject(e.target.value); setFilterTopic('ALL'); }}
                  className="appearance-none bg-white/[0.04] border border-white/10 rounded-xl text-zinc-200 text-xs px-4 py-3 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all w-full cursor-pointer hover:bg-white/[0.07]"
                >
                  <option value="ALL">Todas as Matérias</option>
                  {uniqueSubjects.map(s => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
                </select>
              </div>
              {/* Filter: Tópico */}
              <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                <label className="text-[10px] text-zinc-500 font-bold tracking-widest pl-1 flex items-center gap-1.5">
                  <Search className="w-3 h-3 text-cyan-500" /> TÓPICO
                </label>
                <select 
                  value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)}
                  className="appearance-none bg-white/[0.04] border border-white/10 rounded-xl text-zinc-200 text-xs px-4 py-3 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all w-full cursor-pointer hover:bg-white/[0.07]"
                >
                  <option value="ALL">Todos os Tópicos</option>
                  {filteredTopics.map(t => <option key={t} value={t} className="bg-zinc-900">{t}</option>)}
                </select>
              </div>
              {/* Filter: Dificuldade */}
              <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                <label className="text-[10px] text-zinc-500 font-bold tracking-widest pl-1 flex items-center gap-1.5">
                  <Target className="w-3 h-3 text-cyan-500" /> DIFICULDADE
                </label>
                <select 
                  value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="appearance-none bg-white/[0.04] border border-white/10 rounded-xl text-zinc-200 text-xs px-4 py-3 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all w-full cursor-pointer hover:bg-white/[0.07]"
                >
                  <option value="ALL">Qualquer Nível</option>
                  {uniqueDifficulties.map(d => <option key={d} value={d} className="bg-zinc-900">{d}</option>)}
                </select>
              </div>

              {/* Upload (Admin) */}
              {isAdmin && (
                <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                  <label className="text-[10px] text-fuchsia-400 font-bold tracking-widest pl-1 flex items-center gap-1.5">
                    <Upload className="w-3 h-3" /> UPLOAD CSV (ADMIN)
                  </label>
                  <div className="relative">
                    <input type="file" accept=".csv" onChange={handleFileUpload} disabled={uploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl text-[11px] text-fuchsia-300 font-bold tracking-wider px-4 py-3 text-center hover:bg-fuchsia-500/20 transition-colors cursor-pointer">
                      {uploading ? 'PROCESSANDO...' : 'INJETAR ARQUIVO CSV'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Admin: Gestores */}
            {isAdmin && (
              <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/5">
                <button 
                  onClick={onOpenSimulationManager}
                  className="flex items-center gap-2 px-5 py-3 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-2xl text-[10px] font-black text-fuchsia-400 hover:bg-fuchsia-500 hover:text-black transition-all uppercase tracking-[0.2em]"
                >
                  <Plus className="w-4 h-4" /> Gestor de Simulados
                </button>
                <button 
                  onClick={() => setShowSubjectManager(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400 text-[10px] font-bold tracking-[0.2em] hover:bg-cyan-500/20 transition-all shadow-[0_0_20px_rgba(34,211,238,0.1)]"
                >
                  <Book className="w-4 h-4" /> GESTOR DE CATÁLOGO ACADÊMICO
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>


      {/* MODAL GESTOR DE CADEIRAS */}
      <AnimatePresence>
        {showSubjectManager && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowSubjectManager(false)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-3xl max-h-[85vh] bg-zinc-950 border border-white/10 rounded-[2.5rem] p-8 overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowSubjectManager(false)} className="p-2 rounded-full hover:bg-white/5 text-zinc-500 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-black text-white tracking-widest uppercase">CATÁLOGO DE DISCIPLINAS</h2>
                </div>
                <button onClick={() => setShowSubjectManager(false)} className="p-2 rounded-full hover:bg-white/5 text-zinc-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <AdminSubjectManager />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ LISTA DE QUESTÕES ═══════════════ */}
      {loading ? (
        <div className="py-32 flex justify-center"><Loader2 className="w-10 h-10 text-cyan-400 animate-spin" /></div>
      ) : filteredQuestions.length === 0 ? (
        <div className="py-24 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-zinc-600" />
          </div>
          <span className="text-sm text-zinc-500 font-medium">Nenhuma questão encontrada com estes filtros.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-20">
          {filteredQuestions.map((q, idx) => {
            const isSelected = selectedQuestions.has(q.id);
            const isRevealed = revealedAnswers.has(q.id);
            const isExpanded = expandedId === q.id;

            return (
              <motion.div 
                layout
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                className={`group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer
                  ${isSelected 
                    ? 'bg-gradient-to-r from-emerald-500/[0.08] to-cyan-500/[0.05] ring-1 ring-emerald-500/40 shadow-[0_0_25px_rgba(52,211,153,0.08)]' 
                    : 'bg-white/[0.025] hover:bg-white/[0.05] ring-1 ring-white/[0.06] hover:ring-white/15'}`}
              >
                {/* Linha principal */}
                <div className="flex items-center gap-4 px-5 py-4" onClick={() => toggleSelection(q.id)}>
                  {/* Checkbox Estilizado */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${isSelected ? 'bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-[0_0_12px_rgba(52,211,153,0.4)]' : 'bg-white/5 border border-white/15 group-hover:border-white/30'}`}>
                    {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </div>

                  {/* Número */}
                  <span className="text-xs text-zinc-600 font-mono font-bold w-8 shrink-0 text-center">{idx + 1}</span>
                  
                  {/* Texto da Questão */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-relaxed transition-colors ${isSelected ? 'text-zinc-100' : 'text-zinc-300 group-hover:text-zinc-100'} ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {q.question_text}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="hidden lg:flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold tracking-wider bg-white/[0.06] text-zinc-400 px-3 py-1 rounded-lg border border-white/[0.06]">
                      {q.topic}
                    </span>
                    <span className={`text-[10px] font-bold tracking-wider px-3 py-1 rounded-lg border flex items-center gap-1.5 ${diffColor(q.difficulty)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${diffDot(q.difficulty)}`} />
                      {q.difficulty}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : q.id); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={(e) => toggleReveal(e, q.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                      title="Ver gabarito"
                    >
                      {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={(e) => deleteQuestion(e, q.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Purgar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tags Mobile (visíveis apenas em telas pequenas) */}
                <div className="flex lg:hidden items-center gap-2 px-5 pb-3 -mt-1">
                  <span className="text-[9px] font-bold tracking-wider bg-white/[0.06] text-zinc-500 px-2.5 py-1 rounded-lg">{q.subject}</span>
                  <span className="text-[9px] font-bold tracking-wider bg-white/[0.06] text-zinc-500 px-2.5 py-1 rounded-lg">{q.topic}</span>
                  <span className={`text-[9px] font-bold tracking-wider px-2.5 py-1 rounded-lg border flex items-center gap-1 ${diffColor(q.difficulty)}`}>
                    <span className={`w-1 h-1 rounded-full ${diffDot(q.difficulty)}`} />
                    {q.difficulty}
                  </span>
                </div>

                {/* Painel Expandido: Alternativas & Gabarito */}
                <AnimatePresence>
                  {(isExpanded || isRevealed) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 border-t border-white/[0.04]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                          {q.options.filter(o => o && o.trim() !== '').map((opt, i) => {
                            const isCorrect = q.correct_answer === i;
                            return (
                              <div key={i} className={`flex items-start gap-3 text-xs p-3 rounded-xl border transition-all ${isRevealed && isCorrect ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-white/[0.04] bg-white/[0.02] text-zinc-500'}`}>
                                <span className={`font-bold shrink-0 mt-0.5 ${isRevealed && isCorrect ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                  {['A', 'B', 'C', 'D', 'E'][i]})
                                </span> 
                                <span className="leading-relaxed">{opt}</span>
                                {isRevealed && isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
