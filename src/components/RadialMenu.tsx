"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  RefreshCcw, 
  HelpCircle, 
  FileEdit, 
  History, 
  BookOpen, 
  Library,
  Hexagon
} from 'lucide-react';

const navItems = [
  { name: 'Perfil', href: '/', icon: User },
  { name: 'Revisões', href: '/revisoes', icon: RefreshCcw },
  { name: 'Questões', href: '/questoes', icon: HelpCircle },
  { name: 'Simulado', href: '/simulado', icon: FileEdit },
  { name: 'Histórico', href: '/historico', icon: History },
  { name: 'Caderno', href: '/caderno', icon: BookOpen },
  { name: 'Biblioteca', href: '/biblioteca', icon: Library },
];

export default function RadialMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const radius = 160;

  return (
    <div className="fixed bottom-10 left-10 z-50">
      
      {/* SVG de conexões radiais */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none -z-10">
        <svg className="overflow-visible w-0 h-0">
          <AnimatePresence>
            {isOpen && navItems.map((_, index) => {
              const angle = (index * (Math.PI / 2)) / (navItems.length - 1);
              const x = Math.cos(angle) * radius;
              const y = -Math.sin(angle) * radius;
              return (
                <motion.line
                  key={`line-${index}`}
                  x1="0" y1="0"
                  x2={x} y2={y}
                  stroke="rgba(34,211,238,0.2)"
                  strokeWidth="1.5"
                  initial={{ strokeDasharray: radius, strokeDashoffset: radius }}
                  animate={{ strokeDashoffset: 0 }}
                  exit={{ strokeDashoffset: radius }}
                  transition={{ duration: 0.5, delay: index * 0.05, ease: "easeOut" }}
                />
              )
            })}
          </AnimatePresence>
        </svg>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {navItems.map((item, index) => {
              const isActive = pathname === item.href;
              const angle = (index * (Math.PI / 2)) / (navItems.length - 1);
              const x = Math.cos(angle) * radius;
              const y = -Math.sin(angle) * radius;

              return (
                <motion.div
                  key={item.name}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{ x, y, opacity: 1, scale: 1 }}
                  exit={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 260, 
                    damping: 20, 
                    delay: index * 0.05 
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <div className="relative group flex items-center justify-center">
                    <Link
                      href={item.href}
                      className={`
                        flex items-center justify-center w-12 h-12 rounded-full backdrop-blur-md
                        border transition-colors relative z-10
                        ${isActive 
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.5)]' 
                          : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:border-cyan-500/50 hover:text-cyan-300 hover:bg-cyan-900/40'
                        }
                      `}
                    >
                      <item.icon size={20} />
                    </Link>

                    {/* Tooltip Hover Lateral */}
                    <div 
                      className={`
                        absolute left-14 px-3 py-1 bg-black/90 border border-cyan-500/30 rounded 
                        text-[10px] font-mono tracking-widest text-cyan-400 opacity-0 group-hover:opacity-100 
                        transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-[0_0_10px_rgba(34,211,238,0.2)]
                      `}
                    >
                      [{item.name.toUpperCase()}]
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </AnimatePresence>

      {/* Núcleo (Core) */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center justify-center w-16 h-16 bg-white/5 backdrop-blur-xl border border-cyan-400/50 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] z-50 transition-shadow"
      >
        <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping opacity-20"></div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.4, type: "spring" }}
        >
          <Hexagon className="text-cyan-400" size={32} />
        </motion.div>
      </motion.button>
    </div>
  );
}
