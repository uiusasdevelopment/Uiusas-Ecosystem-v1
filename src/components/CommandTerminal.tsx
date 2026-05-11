"use client";

import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { Terminal, FileEdit, BookX, UploadCloud } from 'lucide-react';

export default function CommandTerminal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={() => setOpen(false)} />
      
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-emerald-500/30 rounded-xl shadow-[0_0_30px_rgba(52,211,153,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <Command 
          className="w-full flex flex-col"
          shouldFilter={false}
          loop
        >
          {/* Header/Input */}
          <div className="flex items-center px-4 border-b border-white/5 bg-black/50">
            <Terminal className="text-emerald-400 mr-3" size={20} />
            <Command.Input 
              autoFocus
              className="flex-1 h-14 bg-transparent text-emerald-100 font-mono text-sm outline-none placeholder:text-zinc-600"
              placeholder="Digite um comando ou busque (ex: iniciar simulado)..."
            />
            <div className="font-mono text-[10px] text-zinc-600 bg-zinc-900 px-2 py-1 rounded">ESC</div>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-800">
            <Command.Empty className="py-6 text-center text-sm font-mono text-zinc-500">
              Nenhum comando encontrado.
            </Command.Empty>

            <Command.Group heading="Ações Rápidas" className="px-2 py-3">
              <Command.Item 
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-mono text-zinc-400 aria-selected:bg-emerald-500/10 aria-selected:text-emerald-300 aria-selected:shadow-[inset_0_0_10px_rgba(52,211,153,0.1)] cursor-pointer group transition-all"
                onSelect={() => setOpen(false)}
              >
                <FileEdit size={16} className="group-aria-selected:text-emerald-400" />
                <span>&gt; Iniciar Simulado</span>
              </Command.Item>
              
              <Command.Item 
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-mono text-zinc-400 aria-selected:bg-emerald-500/10 aria-selected:text-emerald-300 aria-selected:shadow-[inset_0_0_10px_rgba(52,211,153,0.1)] cursor-pointer group transition-all"
                onSelect={() => setOpen(false)}
              >
                <BookX size={16} className="group-aria-selected:text-emerald-400" />
                <span>&gt; Acessar Caderno de Erros</span>
              </Command.Item>
              
              <Command.Item 
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-mono text-zinc-400 aria-selected:bg-emerald-500/10 aria-selected:text-emerald-300 aria-selected:shadow-[inset_0_0_10px_rgba(52,211,153,0.1)] cursor-pointer group transition-all"
                onSelect={() => setOpen(false)}
              >
                <UploadCloud size={16} className="group-aria-selected:text-emerald-400" />
                <span>&gt; Upload de PDF</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
