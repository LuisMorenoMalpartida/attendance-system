'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  CalendarCheck, 
  AlertTriangle, 
  TrendingUp,
  Coffee,
  Timer,
  ChevronLeft,
  ChevronRight,
  Calendar
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

interface DaySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAY_NAMES: Record<number, string> = {
  0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mie', 4: 'Jue', 5: 'Vie', 6: 'Sab',
};

export function AttendanceStats() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stats, setStats] = useState<Stats>({
    daysWorkedThisMonth: 0,
    averageCheckIn: '--:--',
    averageCheckOut: '--:--',
    totalHoursThisMonth: 0,
    lateArrivals: 0,
    lunchTimeAverage: '--:--',
  });
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [currentDate]);

  const fetchSchedules = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) return;
      const meData = await meRes.json();
      const userId = meData.id;
      if (!userId) return;

      const res = await fetch(`/api/admin/users/${userId}/schedules`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Error al cargar horarios:', error);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await fetch(`/api/attendance/stats?year=${year}&month=${month}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error al cargar estadisticas:', error);
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

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  const formatScheduleDisplay = () => {
    if (schedules.length === 0) return null;
    const activeDays = schedules.filter(s => s.is_active).sort((a, b) => a.day_of_week - b.day_of_week);
    if (activeDays.length === 0) return 'Sin horario configurado';
    const groups: { days: number[]; start: string; end: string }[] = [];
    for (const day of activeDays) {
      const last = groups[groups.length - 1];
      if (last && last.start === day.start_time && last.end === day.end_time) {
        last.days.push(day.day_of_week);
      } else {
        groups.push({ days: [day.day_of_week], start: day.start_time, end: day.end_time });
      }
    }
    return groups.map(g => {
      const dayNames = g.days.map(d => DAY_NAMES[d]).join('-');
      return `${dayNames} ${g.start.substring(0, 5)} - ${g.end.substring(0, 5)}`;
    }).join(' | ');
  };

  const statItems = [
    {
      label: 'Dias trabajados',
      value: stats.daysWorkedThisMonth,
      icon: CalendarCheck,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
    },
    {
      label: 'Horas totales',
      value: `${stats.totalHoursThisMonth}h`,
      icon: Clock,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/50',
    },
    {
      label: 'Entrada promedio',
      value: stats.averageCheckIn,
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/50',
    },
    {
      label: 'Salida promedio',
      value: stats.averageCheckOut,
      icon: Timer,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950/50',
    },
    {
      label: 'Comida promedio',
      value: stats.lunchTimeAverage,
      icon: Coffee,
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/50',
    },
    {
      label: 'Llegadas tarde',
      value: stats.lateArrivals,
      icon: AlertTriangle,
      color: stats.lateArrivals > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
      bg: stats.lateArrivals > 0 ? 'bg-red-50 dark:bg-red-950/50' : 'bg-green-50 dark:bg-green-950/50',
    },
  ];

  const scheduleDisplay = formatScheduleDisplay();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="relative h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Estadisticas
          </h2>
          
          {/* Selector de mes */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {currentDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
              </span>
            </div>
            <button
              onClick={() => changeMonth(1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Horario laboral dinamico */}
        {scheduleDisplay && (
          <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Tu horario laboral</span>
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              <p>{scheduleDisplay}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {statItems.map((item) => (
              <div
                key={item.label}
                className="stat-card flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.label}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}