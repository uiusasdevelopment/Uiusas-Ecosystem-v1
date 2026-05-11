"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  User, 
  RefreshCcw, 
  HelpCircle, 
  FileEdit, 
  BookOpen
} from 'lucide-react';

const navItems = [
  { name: 'PERFIL', href: '/', icon: User },
  { name: 'REVISÕES', href: '/revisoes', icon: RefreshCcw },
  { name: 'QUESTÕES', href: '/questoes', icon: HelpCircle },
  { name: 'SIMULADO', href: '/simulado', icon: FileEdit },
  { name: 'CADERNO', href: '/caderno', icon: BookOpen },
];

export default function DockNavigation() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <nav className="flex items-center gap-2 px-4 py-3 bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <div 
              key={item.name} 
              className="relative flex justify-center"
              onMouseEnter={() => setHovered(item.name)}
              onMouseLeave={() => setHovered(null)}
            >
              <Link
                href={item.href}
                className={`
                  p-3 rounded-xl transition-all duration-300 relative
                  ${isActive 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : 'text-zinc-500 hover:text-emerald-300 hover:bg-emerald-500/5'}
                `}
              >
                <item.icon size={24} className={`transition-transform duration-300 ${hovered === item.name || isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : ''}`} />
              </Link>

              {/* Tooltip */}
              <div 
                className={`
                  absolute -top-12 px-3 py-1.5 bg-zinc-900 border border-emerald-500/30 
                  rounded text-emerald-400 font-mono text-[10px] tracking-widest whitespace-nowrap
                  transition-all duration-200 pointer-events-none shadow-[0_0_10px_rgba(52,211,153,0.2)]
                  ${hovered === item.name ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                `}
              >
                [ {item.name} ]
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
