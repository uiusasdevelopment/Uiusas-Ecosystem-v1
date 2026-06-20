'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UiusasLogo } from '@/components/UiusasLogo';
import { 
  ChevronLeft, Award, Flame, Target, BookOpen, 
  Settings, Activity, Zap, Shield, Microscope, Cpu, Crosshair, ShieldAlert, Trophy
} from 'lucide-react';
import { ProfileModal } from '@/components/ProfileModal';
import Link from 'next/link';

interface UserProfile {
  id: string;
  email: string;
  nivel: string;
  cra: number;
  display_name: string;
  avatar_id: string;
  stats_data: any;
  active_subjects?: string[];
}

const AVATAR_MAP: Record<string, any> = {
  Cpu: Cpu,
  Crosshair: Crosshair,
  Shield: Shield,
  Zap: Zap,
  Target: Target
};

// ==========================================
// MOCK DATA (Enquanto não há usuários o suficiente)
// ==========================================
// MOCK DATA REMOVIDO PARA USAR DADOS REAIS

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [realStats, setRealStats] = useState({
    questions_answered: 0,
    accuracy: 0,
    streak_days: 0,
    points: 0
  });
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsGuest(true);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('users_profile')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile({
          id: user.id,
          email: user.email || '',
          nivel: data.nivel || 'P1',
          cra: data.cra || 0,
          display_name: data.display_name || 'Operador Desconhecido',
          avatar_id: data.avatar_id || 'Cpu',
          stats_data: data.stats_data || {}
        });

        // Calcular Estatísticas Reais do Histórico
        const { data: history } = await supabase.from('quiz_history').select('*').eq('user_id', user.id);
        if (history && history.length > 0) {
          const totalCorrect = history.reduce((acc, h) => acc + h.score_correct, 0);
          const totalAnswered = history.reduce((acc, h) => acc + h.score_total, 0);
          setRealStats({
            questions_answered: totalAnswered,
            accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
            streak_days: data.current_streak || 0,
            points: data.total_points || 0
          });
        } else {
          setRealStats(prev => ({ ...prev, points: data.total_points || 0 }));
        }
      }

      // Fetch Top Leaderboard (Users with points)
      const { data: topUsers } = await supabase
        .from('users_profile')
        .select('id, display_name, total_points, avatar_id')
        .gt('total_points', 0)
        .order('total_points', { ascending: false })
        .limit(5);
      
      if (topUsers) setLeaderboard(topUsers);

      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleProfileUpdate = (newName: string, newNivel: string, newCra: number, newAvatarId: string, newSubjects: string[]) => {
    setProfile(prev => prev ? { ...prev, display_name: newName, nivel: newNivel, cra: newCra, avatar_id: newAvatarId, active_subjects: newSubjects } : null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <UiusasLogo className="w-16 h-16 animate-pulse" />
      </div>
    );
  }

  if (isGuest || !profile) {
    return (
      <div className="min-h-screen bg-black font-mono text-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="border border-fuchsia-500/50 bg-black/80 backdrop-blur-md p-12 flex flex-col items-center text-center max-w-md z-10 shadow-[0_0_50px_rgba(217,70,239,0.15)]">
          <ShieldAlert className="w-16 h-16 text-fuchsia-500 mb-6 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]" />
          <h1 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-fuchsia-200 mb-2">ACESSO RESTRITO</h1>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            A Identidade de Operador e os Rankings Globais estão disponíveis apenas para membros alistados. O Modo Convidado não possui privilégios de Perfil.
          </p>
          <div className="flex gap-4 w-full">
            <button onClick={() => router.push('/')} className="flex-1 py-3 border border-white/20 text-zinc-400 text-xs tracking-widest hover:bg-white/5 transition-colors">
              VOLTAR
            </button>
            <Link href="/login" className="flex-1 py-3 border border-fuchsia-500/50 bg-fuchsia-950/30 text-fuchsia-400 text-xs tracking-widest font-bold hover:bg-fuchsia-900/50 transition-colors flex items-center justify-center">
              INICIAR SESSÃO
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Estatísticas Dinâmicas
  const stats = realStats;

  const badges = profile.stats_data?.badges || [
    { id: "b1", name: "Primeiro Sangue", description: "Sobreviveu à primeira semana de uso da plataforma.", icon: Flame, color: "text-orange-400", border: "border-orange-500/30" },
    { id: "b2", name: "Mestre da Patologia", description: "Acertou 50 questões seguidas de Patologia.", icon: Microscope, color: "text-fuchsia-400", border: "border-fuchsia-500/30" },
    { id: "b3", name: "O Insone", description: "Fechou um simulado completo de madrugada.", icon: Zap, color: "text-yellow-400", border: "border-yellow-500/30" },
    { id: "b4", name: "Perfeição", description: "Taxa de acerto de 100% em uma bateria.", icon: Shield, color: "text-cyan-400", border: "border-cyan-500/30" }
  ];

  const AvatarIcon = AVATAR_MAP[profile.avatar_id] || Cpu;

  return (
    <div className="min-h-screen bg-black font-mono text-white overflow-y-auto overflow-x-hidden relative custom-scrollbar">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none" />
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto p-4 md:p-8 relative z-10">
        
        {/* Navbar */}
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors mb-8 group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs tracking-widest">VOLTAR AO TERMINAL</span>
        </button>

        {/* Header (Steam Level Style) */}
        <div className="relative border border-white/10 bg-black/50 backdrop-blur-md p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-8 mb-8 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
          
          {/* Avatar Area */}
          <div className="relative group shrink-0">
            <div className="w-32 h-32 bg-cyan-950/50 border-2 border-cyan-500/50 flex items-center justify-center relative z-10 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
              <AvatarIcon className="w-16 h-16 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            </div>
            {/* Level Badge (Steam style) */}
            <div className="absolute -bottom-4 -right-4 w-14 h-14 bg-black border-2 border-fuchsia-500 flex items-center justify-center z-20 shadow-[0_0_15px_rgba(217,70,239,0.5)] transform rotate-12">
              <span className="text-fuchsia-400 font-black tracking-tighter">{profile.nivel}</span>
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1 text-center md:text-left flex flex-col justify-center h-32">
            <h1 className="text-3xl md:text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200 mb-2">
              {profile.display_name.toUpperCase()}
            </h1>
            <p className="text-zinc-500 text-xs tracking-[0.2em]">{profile.email}</p>
          </div>

          {/* Edit Action */}
          <div className="h-32 flex items-center">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="px-6 py-3 border border-white/20 bg-white/5 hover:bg-white/10 text-xs tracking-widest font-bold flex items-center gap-2 transition-all hover:border-cyan-500/50 hover:text-cyan-400"
            >
              <Settings className="w-4 h-4" />
              EDITAR IDENTIDADE
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Lado Esquerdo: Stats Sidebar (Span 4) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Score Highlight */}
            <div className="border border-cyan-500/30 bg-cyan-950/20 p-6 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <Trophy className="w-32 h-32" />
              </div>
              <span className="text-cyan-500 text-[10px] tracking-[0.3em] font-bold mb-2 z-10">PONTOS DE SIMULADO</span>
              <span className="text-5xl font-black text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] z-10">
                {stats.points.toLocaleString()}
              </span>
            </div>

            {/* Combat Stats */}
            <div className="border border-white/10 bg-black/50 backdrop-blur-md p-6">
              <h2 className="text-xs text-zinc-400 tracking-[0.2em] mb-6 flex items-center gap-2 border-b border-white/10 pb-3">
                <Activity className="w-4 h-4" /> ESTATÍSTICAS GERAIS
              </h2>
              
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-zinc-500">QUESTÕES RESOLVIDAS</span>
                  <span className="text-lg font-bold text-white">{stats.questions_answered}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs text-zinc-500">PRECISÃO GLOBAL</span>
                  <span className="text-lg font-bold text-emerald-400">{stats.accuracy}%</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs text-zinc-500">SEQUÊNCIA (STREAK)</span>
                  <span className="text-lg font-bold text-orange-400 flex items-center gap-1">
                    <Flame className="w-4 h-4" /> {stats.streak_days} DIAS
                  </span>
                </div>
              </div>
            </div>

            {/* Radar Chart Visual (SVG Geometric) */}
            <div className="border border-white/10 bg-black/50 backdrop-blur-md p-6 flex flex-col items-center">
              <h2 className="text-xs text-zinc-400 tracking-[0.2em] mb-4 w-full flex items-center gap-2 border-b border-white/10 pb-3">
                <Target className="w-4 h-4" /> PERFORMANCE (RADAR)
              </h2>
              <div className="relative w-48 h-48 mt-4">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                  {/* Fundo do Radar */}
                  <polygon points="50,10 90,38 75,85 25,85 10,38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <polygon points="50,30 70,44 62,68 38,68 30,44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <line x1="50" y1="50" x2="50" y2="10" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <line x1="50" y1="50" x2="90" y2="38" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <line x1="50" y1="50" x2="75" y2="85" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <line x1="50" y1="50" x2="25" y2="85" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <line x1="50" y1="50" x2="10" y2="38" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  
                  {/* Área de Desempenho (Polígono) */}
                  <polygon 
                    points="50,20 80,45 65,75 35,60 25,40" 
                    fill="rgba(34,211,238,0.2)" 
                    stroke="#22d3ee" 
                    strokeWidth="1.5"
                    style={{ filter: "drop-shadow(0 0 5px rgba(34,211,238,0.5))" }}
                  />
                  {/* Pontos */}
                  <circle cx="50" cy="20" r="2" fill="#22d3ee" />
                  <circle cx="80" cy="45" r="2" fill="#22d3ee" />
                  <circle cx="65" cy="75" r="2" fill="#22d3ee" />
                  <circle cx="35" cy="60" r="2" fill="#22d3ee" />
                  <circle cx="25" cy="40" r="2" fill="#22d3ee" />
                </svg>
                
                {/* Labels */}
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] text-cyan-400">IMUNOLOGIA</span>
                <span className="absolute top-[30%] -right-8 text-[8px] text-zinc-400">ANATOMIA</span>
                <span className="absolute bottom-0 -right-6 text-[8px] text-zinc-400">PATOLOGIA</span>
                <span className="absolute bottom-0 -left-8 text-[8px] text-zinc-400">FISIOLOGIA</span>
                <span className="absolute top-[30%] -left-10 text-[8px] text-zinc-400">FARMACOLOGIA</span>
              </div>
            </div>

          </div>

          {/* Lado Direito: Badge Showcase & Leaderboard (Span 8) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Vitrine de Conquistas */}
            <div className="border border-fuchsia-500/30 bg-black/50 backdrop-blur-md p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-6 border-b border-fuchsia-500/20 pb-4">
                <Award className="w-6 h-6 text-fuchsia-400" />
                <h2 className="text-lg text-fuchsia-400 tracking-[0.2em] font-bold">VITRINE DE CONQUISTAS</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {badges.map((badge: any, i: number) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={badge.id} 
                    className={`flex gap-4 p-4 bg-black/80 border ${badge.border} hover:bg-white/5 transition-colors group cursor-default`}
                  >
                    <div className="w-12 h-12 shrink-0 border border-white/10 bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <badge.icon className={`w-6 h-6 ${badge.color}`} />
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className={`text-sm font-bold tracking-wider mb-1 ${badge.color}`}>
                        {badge.name.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-zinc-400 leading-relaxed">
                        {badge.description}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Leaderboard Global */}
            <div className="border border-white/10 bg-black/50 backdrop-blur-md p-6 flex flex-col flex-1">
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <Globe className="w-5 h-5 text-zinc-400" />
                <h2 className="text-sm text-white tracking-[0.2em] font-bold">RANKING DE OPERADORES (TOP SIMULADOS)</h2>
              </div>
              
              <div className="flex flex-col gap-2">
                {leaderboard.length > 0 ? leaderboard.map((op, i) => {
                  const Icon = AVATAR_MAP[op.avatar_id] || Cpu;
                  return (
                    <div key={op.id} className="flex items-center gap-4 bg-white/5 p-3 border border-white/5 hover:border-cyan-500/30 transition-colors">
                      <span className={`text-xl font-black w-6 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-orange-600' : 'text-zinc-600'}`}>
                        {i + 1}
                      </span>
                      <div className="w-8 h-8 border border-white/20 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-zinc-400" />
                      </div>
                      <span className="text-sm font-bold flex-1 text-white">{op.display_name?.toUpperCase()}</span>
                      <span className="text-cyan-400 font-bold tracking-widest">{op.total_points.toLocaleString()} <span className="text-[10px] text-zinc-500">PTS</span></span>
                    </div>
                  )
                }) : (
                  <div className="py-8 border border-dashed border-white/10 text-center text-zinc-600 text-xs italic">
                    Nenhum operador ranqueado no momento.
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex items-center justify-between p-3 border border-cyan-500/30 bg-cyan-950/20">
                <div className="flex items-center gap-4">
                  <span className="text-xl font-black w-6 text-center text-cyan-500">--</span>
                  <div className="w-8 h-8 border border-cyan-500 flex items-center justify-center shrink-0">
                    <AvatarIcon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-sm font-bold text-cyan-400">VOCÊ</span>
                </div>
                <span className="text-cyan-400 font-bold tracking-widest">{stats.points.toLocaleString()} <span className="text-[10px] text-cyan-700">PTS</span></span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <ProfileModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        userId={profile.id}
        userEmail={profile.email}
        initialDisplayName={profile.display_name}
        nivel={profile.nivel}
        cra={profile.cra}
        avatarId={profile.avatar_id}
        activeSubjects={profile.active_subjects || []}
        onUpdate={handleProfileUpdate}
      />
    </div>
  );
}

// Icon for the Globe since I didn't import it at the top
const Globe = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
)
