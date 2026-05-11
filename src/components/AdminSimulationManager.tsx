'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Plus, Trash2, Save, X, Search, Check, 
  ChevronRight, Layout, BookOpen, AlertTriangle,
  ArrowRight, ListChecks, Filter, Info, Play, Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
  id: string;
  subject: string;
  topic: string;
  question_text: string;
}

interface Simulation {
  id: string;
  title: string;
  description: string;
  subject: string;
  period: string;
}

export function AdminSimulationManager({ 
  onClose, 
  onTestSimulation 
}: { 
  onClose: () => void;
  onTestSimulation?: (questionIds: string[], title?: string, subject?: string, id?: string) => void;
}) {
  const [questionsPool, setQuestionsPool] = useState<Question[]>([]);
  const [draftQuestions, setDraftQuestions] = useState<Question[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [simulationSubject, setSimulationSubject] = useState('');
  const [simulationPeriod, setSimulationPeriod] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterTopic, setFilterTopic] = useState('ALL');
  
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'HOME' | 'CREATE' | 'MANAGE'>('HOME');

  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const [qRes, sRes] = await Promise.all([
      supabase.from('quiz_questions').select('id, subject, topic, question_text').order('created_at', { ascending: false }),
      supabase.from('quiz_simulations').select('*').eq('is_official', true).order('created_at', { ascending: false })
    ]);
    
    if (qRes.data) setQuestionsPool(qRes.data);
    if (sRes.data) setSimulations(sRes.data);
    setLoading(false);
  };

  const handleEdit = async (sim: Simulation) => {
    setEditingId(sim.id);
    setTitle(sim.title);
    setDescription(sim.description);
    setSimulationSubject(sim.subject || '');
    setSimulationPeriod(sim.period || '');
    
    // Fetch questions for this simulation
    const { data } = await supabase
      .from('quiz_simulation_questions')
      .select('question_id, quiz_questions(id, subject, topic, question_text)')
      .eq('simulation_id', sim.id)
      .order('question_order', { ascending: true });
    
    if (data) {
      const qs = data.map((d: any) => d.quiz_questions);
      setDraftQuestions(qs);
    }
    setActiveTab('CREATE');
  };

  const handleTest = async (simId: string) => {
    const { data } = await supabase
      .from('quiz_simulation_questions')
      .select('question_id')
      .eq('simulation_id', simId)
      .order('question_order', { ascending: true });
    
    if (data && data.length > 0) {
      const sim = simulations.find(s => s.id === simId);
      onTestSimulation?.(data.map(d => d.question_id), sim?.title, sim?.subject, sim?.id);
      onClose();
    }
  };

  const addToDraft = (q: Question) => {
    if (!draftQuestions.find(dq => dq.id === q.id)) {
      setDraftQuestions(prev => [...prev, q]);
    }
  };

  const removeFromDraft = (id: string) => {
    setDraftQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim() || draftQuestions.length === 0) {
      alert("Título e pelo menos uma questão são necessários.");
      return;
    }

    setIsSaving(true);
    
    if (editingId) {
      // Update
      await supabase.from('quiz_simulations').update({
        title, description, subject: simulationSubject, period: simulationPeriod
      }).eq('id', editingId);

      // Clean and Re-insert questions
      await supabase.from('quiz_simulation_questions').delete().eq('simulation_id', editingId);
      
      const links = draftQuestions.map((q, idx) => ({
        simulation_id: editingId,
        question_id: q.id,
        question_order: idx + 1
      }));
      await supabase.from('quiz_simulation_questions').insert(links);

      alert("Protocolo atualizado.");
    } else {
      // Insert
      const { data: sim, error: simError } = await supabase
        .from('quiz_simulations')
        .insert({ title, description, is_official: true, subject: simulationSubject, period: simulationPeriod })
        .select().single();

      if (simError) {
        alert("Erro: " + simError.message);
        setIsSaving(false);
        return;
      }

      const links = draftQuestions.map((q, idx) => ({
        simulation_id: sim.id,
        question_id: q.id,
        question_order: idx + 1
      }));
      await supabase.from('quiz_simulation_questions').insert(links);
      alert("Protocolo oficial selado!");
    }

    setTitle('');
    setDescription('');
    setSimulationSubject('');
    setSimulationPeriod('');
    setDraftQuestions([]);
    setEditingId(null);
    fetchInitialData();
    setActiveTab('MANAGE');
    setIsSaving(false);
  };

  const deleteSimulation = async (id: string) => {
    if (!confirm("Remover este preset permanentemente?")) return;
    const { error } = await supabase.from('quiz_simulations').delete().eq('id', id);
    if (!error) {
      alert("Simulado removido com sucesso.");
      fetchInitialData();
    } else {
      alert("Erro ao remover: " + error.message);
    }
  };

  const subjects = Array.from(new Set(questionsPool.map(q => q.subject))).sort();
  const topics = Array.from(new Set(questionsPool.filter(q => filterSubject === 'ALL' || q.subject === filterSubject).map(q => q.topic))).sort();
  
  const filteredPool = questionsPool.filter(q => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === 'ALL' || q.subject === filterSubject;
    const matchesTopic = filterTopic === 'ALL' || q.topic === filterTopic;
    const notInDraft = !draftQuestions.find(dq => dq.id === q.id);
    return matchesSearch && matchesSubject && matchesTopic && notInDraft;
  });

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="px-10 py-8 bg-white/[0.02] border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="p-3 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-2xl">
            <Layout className="w-6 h-6 text-fuchsia-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setActiveTab('HOME'); setEditingId(null); setTitle(''); setDescription(''); setDraftQuestions([]); setSimulationSubject(''); setSimulationPeriod(''); }}
                className={`text-lg font-black tracking-widest uppercase transition-all ${activeTab === 'HOME' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                Início
              </button>
              <span className="text-zinc-800">/</span>
              <button 
                onClick={() => { setActiveTab('CREATE'); setEditingId(null); setTitle(''); setDescription(''); setDraftQuestions([]); setSimulationSubject(''); setSimulationPeriod(''); }}
                className={`text-lg font-black tracking-widest uppercase transition-all ${activeTab === 'CREATE' && !editingId ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                {editingId ? 'Editando Protocolo' : 'Novo Protocolo'}
              </button>
              <span className="text-zinc-800">/</span>
              <button 
                onClick={() => setActiveTab('MANAGE')}
                className={`text-lg font-black tracking-widest uppercase transition-all ${activeTab === 'MANAGE' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                Gerenciar Ativos
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 tracking-[0.3em] uppercase mt-1">Central de Comando de Simulados // V2.5</p>
          </div>
        </div>
        <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
          <X className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'HOME' ? (
          <motion.div 
            key="home"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex items-center justify-center p-12"
          >
            <div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
              <button 
                onClick={() => setActiveTab('CREATE')}
                className="group relative flex flex-col items-center justify-center p-12 bg-white/[0.02] border border-white/5 rounded-[3rem] hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-all"
              >
                <div className="w-20 h-20 bg-fuchsia-500/10 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Plus className="w-10 h-10 text-fuchsia-400" />
                </div>
                <h3 className="text-xl font-black text-white tracking-widest uppercase mb-2">Novo Protocolo</h3>
                <p className="text-xs text-zinc-500 text-center uppercase tracking-tighter">Criar um novo simulado oficial do zero</p>
              </button>

              <button 
                onClick={() => setActiveTab('MANAGE')}
                className="group relative flex flex-col items-center justify-center p-12 bg-white/[0.02] border border-white/5 rounded-[3rem] hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
              >
                <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Layout className="w-10 h-10 text-cyan-400" />
                </div>
                <h3 className="text-xl font-black text-white tracking-widest uppercase mb-2">Gerenciar Ativos</h3>
                <p className="text-xs text-zinc-500 text-center uppercase tracking-tighter">Editar ou excluir simulados existentes</p>
                {simulations.length > 0 && (
                  <span className="absolute top-6 right-6 px-3 py-1 bg-cyan-500 text-black text-[10px] font-black rounded-full">{simulations.length}</span>
                )}
              </button>
            </div>
          </motion.div>
        ) : activeTab === 'CREATE' ? (
          <motion.div 
            key="create"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex overflow-hidden"
          >
            {/* Pool of Questions */}
            <div className="w-[40%] flex flex-col border-r border-white/5 bg-black/20">
              <div className="p-6 space-y-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Acervo Disponível</h3>
                  <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-zinc-400">{filteredPool.length}</span>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input 
                      type="text" 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="BUSCAR QUESTÃO..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-fuchsia-500/50 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={filterSubject}
                      onChange={(e) => { setFilterSubject(e.target.value); setFilterTopic('ALL'); }}
                      className="bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-[9px] text-zinc-400 focus:outline-none uppercase font-bold"
                    >
                      <option value="ALL">CADEIRA</option>
                      {subjects.map(s => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
                    </select>
                    <select 
                      value={filterTopic}
                      onChange={(e) => setFilterTopic(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-[9px] text-zinc-400 focus:outline-none uppercase font-bold"
                    >
                      <option value="ALL">TÓPICO</option>
                      {topics.map(t => <option key={t} value={t} className="bg-zinc-900">{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                {filteredPool.map(q => (
                  <div key={q.id} className="group p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-white/20 transition-all">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[8px] font-black bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">{q.subject}</span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3">{q.question_text}</p>
                      </div>
                      <button 
                        onClick={() => addToDraft(q)}
                        className="p-2 bg-fuchsia-500/10 text-fuchsia-400 rounded-xl hover:bg-fuchsia-500 hover:text-black transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Draft Panel */}
            <div className="flex-1 flex flex-col bg-white/[0.01]">
              <div className="p-8 space-y-6 flex-1 flex flex-col overflow-hidden">
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-1">
                    <label className="text-[10px] text-zinc-600 font-black tracking-widest uppercase">Período</label>
                    <select 
                      value={simulationPeriod}
                      onChange={(e) => setSimulationPeriod(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-cyan-500/50 uppercase font-bold"
                    >
                      <option value="">--</option>
                      {['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12'].map(p => (
                        <option key={p} value={p} className="bg-zinc-900">{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 col-span-1">
                    <label className="text-[10px] text-zinc-600 font-black tracking-widest uppercase">Cadeira</label>
                    <select 
                      value={simulationSubject}
                      onChange={(e) => setSimulationSubject(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="">Selecione...</option>
                      {subjects.map(s => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] text-zinc-600 font-black tracking-widest uppercase">Título do Preset</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="EX: MÓDULO ALFA - P3"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm font-bold focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-600 font-black tracking-widest uppercase">Descrição</label>
                  <input 
                    type="text" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="OBJETIVO DO SIMULADO..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                  <h3 className="text-[10px] font-black text-cyan-500 tracking-widest uppercase flex items-center gap-2 mb-4">
                    <ListChecks className="w-4 h-4" /> Composição ({draftQuestions.length})
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {draftQuestions.length > 0 ? draftQuestions.map((q, idx) => (
                      <div key={q.id} className="flex items-center gap-4 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl group animate-in slide-in-from-right-4">
                        <span className="text-[10px] font-black text-cyan-800 w-4">{idx + 1}</span>
                        <div className="flex-1">
                          <p className="text-[11px] text-white font-medium line-clamp-1">{q.question_text}</p>
                        </div>
                        <button onClick={() => removeFromDraft(q.id)} className="p-1.5 text-zinc-600 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-white/5 rounded-[2rem]">
                        <Plus className="w-8 h-8 text-zinc-800 mb-2" />
                        <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">Adicione questões do acervo</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => setActiveTab('HOME')}
                    className="px-8 py-6 bg-white/5 text-zinc-400 rounded-2xl text-xs font-black tracking-widest hover:bg-white/10 transition-all uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || draftQuestions.length === 0 || !title.trim()}
                    className="flex-1 py-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-black rounded-2xl text-xs font-black tracking-[0.3em] hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all disabled:opacity-30 uppercase"
                  >
                    {isSaving ? 'Processando...' : editingId ? 'Atualizar Protocolo' : 'Publicar Protocolo Oficial'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="manage"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 p-10 overflow-y-auto custom-scrollbar"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {simulations.map(sim => (
                <div key={sim.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] flex flex-col gap-6 group hover:border-white/10 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-zinc-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[8px] font-black bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase">{sim.period || 'S/ PER'}</span>
                          <span className="text-[8px] font-black bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded uppercase">{sim.subject || 'S/ CAT'}</span>
                          <h4 className="text-sm font-black text-white tracking-widest uppercase">{sim.title}</h4>
                        </div>
                        <p className="text-[10px] text-zinc-500 uppercase">{sim.description || 'Sem descrição definida'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleTest(sim.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      <Play className="w-3 h-3" /> Testar Protocolo
                    </button>
                    <button 
                      onClick={() => handleEdit(sim)}
                      className="px-4 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-xl transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteSimulation(sim.id)}
                      className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 4px; }
      `}} />
    </div>
  );
}
