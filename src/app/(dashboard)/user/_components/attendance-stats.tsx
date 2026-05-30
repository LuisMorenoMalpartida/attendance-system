'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  CalendarCheck, 
  AlertTriangle, 
  TrendingUp,
  Coffee,
  Timer
} from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface Stats {
  daysWorkedThisMonth: number;
  averageCheckIn: string;
  averageCheckOut: string;
  totalHoursThisMonth: number;
  lateArrivals: number;
  lunchTimeAverage: string;
}

export function AttendanceStats() {
  const [stats, setStats] = useState<Stats>({
    daysWorkedThisMonth: 0,
    averageCheckIn: '--:--',
    averageCheckOut: '--:--',
    totalHoursThisMonth: 0,
    lateArrivals: 0,
    lunchTimeAverage: '--:--',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/attendance/stats');
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

  const statItems = [
    {
      label: 'Días trabajados',
      value: stats.daysWorkedThisMonth,
      subtext: 'este mes',
      icon: CalendarCheck,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
    },
    {
      label: 'Horas totales',
      value: `${stats.totalHoursThisMonth}h`,
      subtext: 'este mes',
      icon: Clock,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/50',
    },
    {
      label: 'Entrada promedio',
      value: stats.averageCheckIn,
      subtext: 'últimos 30 días',
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/50',
    },
    {
      label: 'Salida promedio',
      value: stats.averageCheckOut,
      subtext: 'últimos 30 días',
      icon: Timer,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950/50',
    },
    {
      label: 'Comida promedio',
      value: stats.lunchTimeAverage,
      subtext: 'Lun-Vie',
      icon: Coffee,
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/50',
    },
    {
      label: 'Llegadas tarde',
      value: stats.lateArrivals,
      subtext: 'este mes',
      icon: AlertTriangle,
      color: stats.lateArrivals > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
      bg: stats.lateArrivals > 0 ? 'bg-red-50 dark:bg-red-950/50' : 'bg-green-50 dark:bg-green-950/50',
    },
  ];

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="relative h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
      
      <div className="p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Estadísticas
        </h2>

        {/* 👇 Info de horario */}
        <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Horario laboral</span>
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 space-y-0.5">
            <p>Lunes a Viernes: 08:00 - 17:45</p>
            <p>Sábados: 09:00 - 12:00</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {statItems.map((item, index) => (
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
      </div>
    </div>
  );
}