'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Tag, Book, ChevronDown, ChevronUp, AlertCircle, Loader2, Search, X } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  period: string;
}

export function AdminSubjectManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPeriod, setNewPeriod] = useState('P1');
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('quiz_subjects').select('*').order('period', { ascending: true }).order('name', { ascending: true });
    if (data) setSubjects(data);
    setLoading(false);
  };

  const addSubject = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    const { error } = await supabase.from('quiz_subjects').insert({ 
      name: newName.trim(), 
      period: newPeriod 
    });

    if (error) {
      if (error.code === '23505') alert('Esta cadeira já existe!');
      else alert('Erro: ' + error.message);
    } else {
      setNewName('');
      fetchSubjects();
    }
    setIsAdding(false);
  };

  const deleteSubject = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja apagar a cadeira "${name}"? Isso afetará os filtros de todos os usuários.`)) return;
    
    const { error } = await supabase.from('quiz_subjects').delete().eq('id', id);
    if (!error) {
      setSubjects(prev => prev.filter(s => s.id !== id));
    } else {
      alert('Erro ao deletar: ' + error.message);
    }
  };

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.period.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        <span className="text-[10px] text-zinc-500 tracking-widest uppercase">Acessando Banco de Dados...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Add Form */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Book className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-widest uppercase">Gestor de Matriz Acadêmica</h3>
            <p className="text-[9px] text-zinc-500 tracking-widest uppercase">Controle Central de Cadeiras e Períodos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase pl-1">Nome da Cadeira</label>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Anatomia Humana I"
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase pl-1">Período Alvo</label>
            <select 
              value={newPeriod}
              onChange={(e) => setNewPeriod(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => `P${i + 1}`).map(p => (
                <option key={p} value={p} className="bg-zinc-950">{p}</option>
              ))}
              <option value="Outros" className="bg-zinc-950">OUTROS</option>
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={addSubject}
              disabled={isAdding || !newName.trim()}
              className="w-full py-3.5 bg-cyan-500 text-black font-black text-[10px] tracking-widest rounded-xl hover:bg-cyan-400 transition-all shadow-[0_4px_15px_rgba(34,211,238,0.2)] disabled:opacity-50"
            >
              {isAdding ? 'CADASTRANDO...' : 'CADASTRAR CADEIRA'}
            </button>
          </div>
        </div>
      </div>

      {/* List Area */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-3">
            <Tag className="w-4 h-4 text-zinc-600" />
            <h4 className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Catalogadas ({subjects.length})</h4>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="bg-white/5 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-zinc-400 focus:outline-none focus:border-white/20 w-40"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filteredSubjects.map((s, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              key={s.id}
              className="group flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-2xl hover:border-white/20 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                  {s.period}
                </div>
                <span className="text-xs text-zinc-300 font-bold uppercase">{s.name}</span>
              </div>
              <button 
                onClick={() => deleteSubject(s.id, s.name)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}

          {filteredSubjects.length === 0 && (
            <div className="col-span-2 py-10 border border-dashed border-white/5 rounded-2xl text-center">
              <p className="text-[10px] text-zinc-600 tracking-widest uppercase">Nenhuma cadeira encontrada no catálogo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
