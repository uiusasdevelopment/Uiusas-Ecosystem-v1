'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, LogOut, Check, Cpu, Crosshair, Shield, Zap, Target, 
  AlertTriangle, Settings, Book, Layers, Trash2, Save, Power, ChevronDown
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

const AVATAR_OPTIONS = [
  { id: 'Sistema', icon: Cpu, label: 'SISTEMA' },
  { id: 'Tático', icon: Crosshair, label: 'TÁTICO' },
  { id: 'Defensor', icon: Shield, label: 'DEFENSOR' },
  { id: 'Impulso', icon: Zap, label: 'IMPULSO' },
  { id: 'Precisão', icon: Target, label: 'PRECISÃO' },
];

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userId: string;
  initialDisplayName: string;
  nivel: string;
  cra: number;
  avatarId: string;
  activeSubjects: string[];
  onUpdate: (newName: string, newNivel: string, newCra: number, newAvatarId: string, newSubjects: string[]) => void;
}

export function ProfileModal({ 
  isOpen, onClose, userEmail, userId, initialDisplayName, 
  nivel, cra, avatarId, activeSubjects, onUpdate 
}: ProfileModalProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [editNivel, setEditNivel] = useState(nivel);
  const [editCra, setEditCra] = useState(cra.toString());
  const [selectedAvatar, setSelectedAvatar] = useState(avatarId || 'Impulso');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(activeSubjects || []);
  const [availableSubjects, setAvailableSubjects] = useState<{name: string, period: string}[]>([]);
  const [filterPeriod, setFilterPeriod] = useState(nivel || 'P3');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDanger, setShowDanger] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [nameError, setNameError] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchSubjects();
      setDisplayName(initialDisplayName);
      setEditNivel(nivel);
      setEditCra(cra.toString());
      setSelectedAvatar(avatarId || 'Impulso');
      setSelectedSubjects(activeSubjects || []);
      setFilterPeriod(nivel || 'P3');
    }
  }, [isOpen, initialDisplayName, nivel, cra, avatarId, activeSubjects]);

  const fetchSubjects = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('quiz_subjects').select('name, period').order('name');
    if (data) setAvailableSubjects(data);
  };

  const toggleSubject = (s: string) => {
    setSelectedSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setNameError('');
    const supabase = createClient();
    const numericCra = parseFloat(editCra.replace(',', '.')) || 0;

    // Check if name is taken by someone else
    if (displayName.trim() !== initialDisplayName) {
      const { data } = await supabase
        .from('users_profile')
        .select('display_name')
        .ilike('display_name', displayName.trim())
        .maybeSingle();

      if (data) {
        setNameError('CODINOME JÁ EM USO.');
        setIsSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from('users_profile')
      .update({ 
        display_name: displayName,
        nivel: editNivel,
        cra: numericCra,
        avatar_id: selectedAvatar,
        active_subjects: selectedSubjects
      })
      .eq('id', userId);

    if (!error) {
      onUpdate(displayName, editNivel, numericCra, selectedAvatar, selectedSubjects);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    } else {
      if (error.code === '23505') {
        setNameError('CODINOME JÁ EM USO.');
      } else {
        alert("Erro ao salvar: " + error.message);
      }
    }
    setIsSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETAR') return;
    
    setIsDeleting(true);
    const supabase = createClient();
    
    const { error } = await supabase.rpc('purgar_operador');

    if (!error) {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } else {
      alert('Erro ao purgar dados: ' + error.message);
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm" 
        onClick={onClose}
      />

      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
      >
        {/* Subtle Inner Glow */}
        <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(30,41,59,0.5)] pointer-events-none" />

        {/* HEADER: IDENTIDADE */}
        <div className="px-8 pt-8 pb-6 flex justify-between items-center relative z-10 border-b border-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 border border-slate-700 flex items-center justify-center rounded-lg shadow-inner">
              <Settings className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wider leading-none mb-1">IDENTIDADE</h2>
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase">{userEmail}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-full">
                <Shield className="w-4 h-4 text-slate-500" />
                <div className="flex flex-col">
                  <span className="text-[8px] text-slate-500 font-black tracking-tighter leading-none">SYSTEM LEVEL</span>
                  <span className="text-sm font-black text-white leading-none">0</span>
                </div>
             </div>
             <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
               <X className="w-6 h-6" />
             </button>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10 relative z-10">
          
          {/* MÓDULO DE AVATAR */}
          <section className="space-y-4">
            <label className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase">MÓDULO DE AVATAR</label>
            <div className="flex justify-between gap-3">
              {AVATAR_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedAvatar === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedAvatar(opt.id)}
                    className={`flex-1 aspect-square flex flex-col items-center justify-center gap-2 rounded-lg border transition-all duration-300 ${
                      isSelected 
                      ? 'bg-slate-900 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' 
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`} />
                    <span className={`text-[8px] font-bold tracking-widest ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`}>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* INPUT GRID */}
          <section className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 font-bold tracking-[0.2em] uppercase">CODINOME</label>
              <div className={`bg-slate-900 rounded-md p-3 border shadow-inner ${nameError ? 'border-red-500/50' : 'border-slate-800/50'}`}>
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setNameError('');
                  }}
                  className="w-full bg-transparent text-white text-sm font-medium focus:outline-none"
                />
              </div>
              {nameError && <p className="text-[8px] text-red-500 font-bold tracking-widest uppercase">{nameError}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 font-bold tracking-[0.2em] uppercase">PERÍODO</label>
              <div className="bg-slate-900 rounded-md p-3 border border-slate-800/50 shadow-inner relative">
                <select 
                  value={editNivel} 
                  onChange={(e) => setEditNivel(e.target.value)}
                  className="w-full bg-transparent text-white text-sm font-medium focus:outline-none appearance-none cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => `P${i + 1}`).map(p => (
                    <option key={p} value={p} className="bg-slate-900">{p}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 font-bold tracking-[0.2em] uppercase">CRA</label>
              <div className="bg-slate-900 rounded-md p-3 border border-slate-800/50 shadow-inner flex items-center justify-between relative overflow-hidden">
                <input 
                  type="text" 
                  value={editCra} 
                  onChange={(e) => setEditCra(e.target.value)}
                  className="w-full bg-transparent text-white text-sm font-medium focus:outline-none relative z-10"
                />
                {/* Mock Sparkline SVG */}
                <svg className="absolute right-2 bottom-2 w-12 h-6 opacity-30" viewBox="0 0 100 40">
                  <path 
                    d="M0 30 Q 25 10 50 25 T 100 15" 
                    fill="none" 
                    stroke="#22d3ee" 
                    strokeWidth="3" 
                  />
                </svg>
              </div>
            </div>
          </section>

          {/* PROTOCOLO DE CADEIRAS */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase">PROTOCOLO DE CADEIRAS</label>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">FILTRAR:</span>
                <select 
                  value={filterPeriod} 
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-cyan-400 font-bold focus:outline-none"
                >
                  <option value="ALL">TODAS</option>
                  {Array.from({ length: 12 }, (_, i) => `P${i + 1}`).map(p => (
                    <option key={p} value={p} className="bg-slate-900">{p}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Overview Placeholder Box */}
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6 min-h-[160px] flex flex-col gap-3">
               <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-[10px] text-slate-300 font-bold">VISÃO GERAL</span>
                  <span className="text-[9px] text-slate-600 font-bold uppercase">{selectedSubjects.length} MÓDULOS ATIVOS</span>
               </div>
               <div className="flex flex-wrap gap-2 pt-2">
                  {selectedSubjects.length > 0 ? selectedSubjects.map(s => (
                    <div key={s} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-md text-[9px] text-slate-300 font-bold uppercase flex items-center gap-2 group">
                      {s}
                      <button onClick={() => toggleSubject(s)} className="text-slate-600 hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )) : (
                    <div className="w-full flex flex-col items-center justify-center py-8 gap-2">
                      <Book className="w-8 h-8 text-slate-800" />
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Nenhum protocolo ativo</p>
                    </div>
                  )}
               </div>
            </div>
          </section>

          {/* ACTION BUTTONS */}
          <section className="pt-6 flex flex-col gap-4">
             <button 
               onClick={handleLogout}
               className="w-full flex items-center justify-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-[10px] font-bold tracking-[0.2em] hover:bg-slate-800 transition-all uppercase"
             >
               <LogOut className="w-4 h-4 text-slate-500" /> DESCONECTAR DA UNIDADE
             </button>

             <div className="flex flex-col items-end gap-3">
               <button 
                 onClick={() => setShowDanger(!showDanger)}
                 className={`flex items-center gap-2 px-4 py-2 rounded-md border text-[9px] font-black tracking-widest transition-all ${
                   showDanger ? 'bg-red-950/20 border-red-500 text-red-500' : 'bg-slate-900/50 border-slate-800 text-slate-600 hover:text-slate-400'
                 }`}
               >
                 <Power className="w-3 h-3" /> SISTEMA DE AUTODESTRUIÇÃO
               </button>

               <AnimatePresence>
                 {showDanger && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     exit={{ opacity: 0, height: 0 }}
                     className="w-full flex flex-col gap-3 overflow-hidden"
                   >
                     <p className="text-[9px] text-red-500/70 uppercase leading-relaxed text-right">
                       ESTA AÇÃO É IRREVERSÍVEL. TODOS OS SEUS PONTOS, HISTÓRICO E CONQUISTAS SERÃO PERMANENTEMENTE PURGADOS DA UNIDADE CENTRAL.
                     </p>
                     <div className="flex gap-2">
                       <input 
                         type="text"
                         value={deleteConfirm}
                         onChange={(e) => setDeleteConfirm(e.target.value)}
                         placeholder="DIGITE 'DELETAR' PARA CONFIRMAR"
                         className="flex-1 bg-red-950/10 border border-red-950/30 rounded px-3 py-2 text-red-500 text-[9px] font-bold focus:outline-none focus:border-red-500/50 placeholder:text-red-900"
                       />
                       <button 
                         onClick={handleDeleteAccount}
                         disabled={deleteConfirm !== 'DELETAR' || isDeleting}
                         className="px-4 py-2 bg-red-600 text-white text-[9px] font-black rounded hover:bg-red-500 disabled:opacity-30 transition-all uppercase"
                       >
                         {isDeleting ? 'PURGANDO...' : 'CONFIRMAR'}
                       </button>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
          </section>

        </div>

        {/* FOOTER: SALVAR PROTOCOLO */}
        <div className="p-8 bg-slate-950 border-t border-slate-800 relative z-20">
          <button 
            onClick={handleSave}
            disabled={isSaving || saved}
            className={`w-full py-6 rounded-xl font-black text-sm tracking-[0.4em] uppercase transition-all duration-500 flex items-center justify-center gap-3 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_35px_rgba(34,211,238,0.6)] group ${
              saved 
              ? 'bg-emerald-500 shadow-emerald-500/30' 
              : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400'
            }`}
          >
            {isSaving ? 'PROCESSANDO...' : saved ? <><Check className="w-5 h-5" /> PROTOCOLO SALVO</> : <><Save className="w-5 h-5 group-hover:scale-110 transition-transform" /> SALVAR PROTOCOLO</>}
          </button>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(30, 41, 59, 0.5); border-radius: 4px; }
      `}} />
    </div>
  );
}
