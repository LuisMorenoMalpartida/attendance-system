'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  CalendarCheck, 
  AlertTriangle, 
  TrendingUp,
  Coffee,
  Timer,
  Users,
  UserCheck,
  UserX,
  Building2
} from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  presentToday: number;
  absentToday: number;
  lateArrivals: number;
  averageCheckIn: string;
  averageCheckOut: string;
  totalHoursToday: number;
  companiesCount: number;
}

interface AdminStatsProps {
  isOwnStats: boolean;
}

export function AdminStats({ isOwnStats }: AdminStatsProps) {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    presentToday: 0,
    absentToday: 0,
    lateArrivals: 0,
    averageCheckIn: '--:--',
    averageCheckOut: '--:--',
    totalHoursToday: 0,
    companiesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [isOwnStats]);

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({
        ...(isOwnStats ? { own: 'true' } : {}),
      });

      const response = await fetch(`/api/admin/stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  useGSAP(() => {
    gsap.fromTo('.stat-card',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out' }
    );
  }, [stats]);

  const globalStats = [
    {
      label: 'Total Usuarios',
      value: stats.totalUsers,
      subtext: 'registrados',
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
    },
    {
      label: 'Usuarios Activos',
      value: stats.activeUsers,
      subtext: 'en el sistema',
      icon: UserCheck,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/50',
    },
    {
      label: 'Presentes Hoy',
      value: stats.presentToday,
      subtext: 'marcaron entrada',
      icon: CalendarCheck,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      label: 'Ausentes Hoy',
      value: stats.absentToday,
      subtext: 'sin registrar',
      icon: UserX,
      color: stats.absentToday > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
      bg: stats.absentToday > 0 ? 'bg-red-50 dark:bg-red-950/50' : 'bg-green-50 dark:bg-green-950/50',
    },
    {
      label: 'Llegadas Tarde',
      value: stats.lateArrivals,
      subtext: 'hoy',
      icon: AlertTriangle,
      color: stats.lateArrivals > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400',
      bg: stats.lateArrivals > 0 ? 'bg-orange-50 dark:bg-orange-950/50' : 'bg-green-50 dark:bg-green-950/50',
    },
    {
      label: 'Empresas',
      value: stats.companiesCount,
      subtext: 'registradas',
      icon: Building2,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/50',
    },
  ];

  const personalStats = [
    {
      label: 'Entrada Promedio',
      value: stats.averageCheckIn,
      subtext: 'últimos 30 días',
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
    },
    {
      label: 'Salida Promedio',
      value: stats.averageCheckOut,
      subtext: 'últimos 30 días',
      icon: Timer,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/50',
    },
    {
      label: 'Horas Hoy',
      value: `${stats.totalHoursToday}h`,
      subtext: 'acumuladas',
      icon: Clock,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      label: 'Comida Promedio',
      value: '--:--',
      subtext: 'tiempo de comida',
      icon: Coffee,
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/50',
    },
  ];

  const displayStats = isOwnStats ? personalStats : globalStats;

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="relative h-1 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600" />
      
      <div className="p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          {isOwnStats ? 'Mis Estadísticas' : 'Estadísticas Globales'}
        </h2>
        
        <div className="space-y-3">
          {displayStats.map((item) => (
            <div
              key={item.label}
              className="stat-card flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {item.label}
                </p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {item.value}
                </p>
              </div>
              
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {item.subtext}
              </span>
            </div>
          ))}
        </div>

        {/* Resumen rápido (solo admin global) */}
        {!isOwnStats && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border border-amber-200 dark:border-amber-900">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
              Resumen del Día
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-amber-600 dark:text-amber-400">Tasa de asistencia:</span>
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  {stats.activeUsers > 0 
                    ? `${Math.round((stats.presentToday / stats.activeUsers) * 100)}%` 
                    : '0%'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-amber-600 dark:text-amber-400">Puntualidad:</span>
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  {stats.presentToday > 0 
                    ? `${Math.round(((stats.presentToday - stats.lateArrivals) / stats.presentToday) * 100)}%` 
                    : '0%'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-amber-600 dark:text-amber-400">Horas promedio:</span>
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  {stats.presentToday > 0 
                    ? `${(stats.totalHoursToday / stats.presentToday).toFixed(1)}h` 
                    : '0h'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}