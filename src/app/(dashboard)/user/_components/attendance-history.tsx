'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  LogIn, 
  LogOut, 
  Coffee, 
  AlertCircle, 
  Edit3, 
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CorrectionRequestModal } from './correction-request-modal';
import { formatTime, formatDate, formatHoursWorked } from '@/lib/date-utils';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';

interface AttendanceRecord {
  id: number;
  type: 'check_in' | 'lunch_out' | 'lunch_in' | 'check_out';
  timestamp: string;
  notes: string | null;
}

interface DayRecord {
  date: string;
  records: AttendanceRecord[];
  hoursWorked: number | null;
}

export function AttendanceHistory() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: records = [], isLoading: loading } = useQuery({
    queryKey: ['attendance-history', year, month],
    queryFn: async () => {
      const response = await fetch(`/api/attendance/history?year=${year}&month=${month}`);
      if (!response.ok) throw new Error('Error al cargar historial');
      const data = await response.json();
      return data.records || [];
    },
    staleTime: 30_000,
  });

  const queryClient = useQueryClient();

  // Convertir records a un Map para acceso rápido por fecha
  const recordsMap = useMemo(() => {
    const map = new Map<string, DayRecord>();
    records.forEach((record: DayRecord) => {
      try {
        const key = record.date ? format(parseISO(record.date), 'yyyy-MM-dd') : record.date;
        map.set(key, record);
      } catch (e) {
        map.set(record.date, record);
      }
    });
    return map;
  }, [records]);

  // Generar días del calendario
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Lunes
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Día seleccionado para ver detalles
  const selectedDayData = selectedDay ? recordsMap.get(selectedDay) : null;

  useGSAP(() => {
    gsap.fromTo('.calendar-day',
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.3, stagger: 0.02, ease: 'back.out(1.7)' }
    );
  }, [calendarDays]);

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
    setSelectedDay(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'check_in': return <LogIn className="w-3 h-3 text-blue-500" />;
      case 'lunch_out': return <Coffee className="w-3 h-3 text-orange-500" />;
      case 'lunch_in': return <Coffee className="w-3 h-3 text-green-500" />;
      case 'check_out': return <LogOut className="w-3 h-3 text-red-500" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = { 
      check_in: 'Entrada', 
      lunch_out: 'Salida comida', 
      lunch_in: 'Regreso comida', 
      check_out: 'Salida' 
    };
    return labels[type] || type;
  };

  const saveNote = async (recordId: number) => {
    try {
      await fetch(`/api/attendance/${recordId}/notes`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ notes: noteText }) 
      });
      setEditingNote(null); 
      queryClient.invalidateQueries({ queryKey: ['attendance-history', year, month] });
    } catch (error) { 
      console.error('Error al guardar nota:', error); 
    }
  };

  const handleRequestCorrection = (date: string) => { 
    setSelectedDate(date); 
    setShowCorrectionModal(true); 
  };

  const getDayStatusColor = (date: Date): string => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = recordsMap.get(dateStr);
    
    if (!isSameMonth(date, currentDate)) return 'opacity-30';
    if (!dayData || dayData.records.length === 0) return 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/30';
    
    const hasCheckIn = dayData.records.some(r => r.type === 'check_in');
    const hasCheckOut = dayData.records.some(r => r.type === 'check_out');
    
    if (hasCheckIn && !hasCheckOut) return 'bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/30';
    if (hasCheckIn && hasCheckOut) return 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/30';
    return 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/30';
  };

  const getDayIndicator = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = recordsMap.get(dateStr);
    
    if (!isSameMonth(date, currentDate) || !dayData) return null;
    
    const types = dayData.records.map(r => r.type);
    const hasCheckIn = types.includes('check_in');
    const hasLunchOut = types.includes('lunch_out');
    const hasLunchIn = types.includes('lunch_in');
    const hasCheckOut = types.includes('check_out');
    
    return (
      <div className="flex gap-0.5 mt-1">
        {hasCheckIn && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Entrada" />}
        {hasLunchOut && <div className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Salida comida" />}
        {hasLunchIn && <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Regreso comida" />}
        {hasCheckOut && <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="Salida" />}
      </div>
    );
  };

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="relative h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600" />
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold">Historial de Asistencia</h2>
              <p className="text-xs text-slate-500 mt-1">
                Selecciona un día para ver los detalles
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => changeMonth(-1)} 
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 min-w-[140px] justify-center">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium capitalize">
                  {format(currentDate, 'MMMM yyyy', { locale: es })}
                </span>
              </div>
              
              <button 
                onClick={() => changeMonth(1)} 
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse">
              <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
          ) : (
            <div>
              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid del calendario */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, idx) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isSelected = selectedDay === dateStr;
                  const isCurrentMonth = isSameMonth(date, currentDate);
                  const isTodayDate = isToday(date);
                  const dayData = recordsMap.get(dateStr);

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (isCurrentMonth) {
                          setSelectedDay(isSelected ? null : dateStr);
                        }
                      }}
                      className={`
                        calendar-day relative min-h-[80px] p-2 rounded-lg transition-all duration-200
                        ${getDayStatusColor(date)}
                        ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400 scale-105 z-10 shadow-lg' : ''}
                        ${isTodayDate ? 'font-bold' : ''}
                        ${!isCurrentMonth ? 'cursor-default' : 'cursor-pointer hover:scale-105 hover:shadow-md'}
                      `}
                    >
                      <span className={`
                        text-xs ${isTodayDate ? 'bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center mx-auto' : ''}
                      `}>
                        {format(date, 'd')}
                      </span>
                      
                      {getDayIndicator(date)}

                      {dayData && dayData.hoursWorked !== null && (
                        <div className="absolute bottom-1 right-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {formatHoursWorked(dayData.hoursWorked)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Panel de detalles del día seleccionado */}
              {selectedDay && selectedDayData && (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">
                      {formatDate(selectedDay)}
                    </h3>
                    <div className="flex items-center gap-2">
                      {selectedDayData.hoursWorked !== null && (
                        <Badge variant="outline" className="text-xs">
                          {formatHoursWorked(selectedDayData.hoursWorked)} hrs
                        </Badge>
                      )}
                      <button
                        onClick={() => setSelectedDay(null)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {selectedDayData.records.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDayData.records.map((record) => (
                        <div key={record.id} className="flex items-center gap-3 text-sm group bg-white dark:bg-slate-800 p-2 rounded-lg">
                          {getTypeIcon(record.type)}
                          <span className="text-slate-600 dark:text-slate-300 min-w-[100px] text-xs">
                            {getTypeLabel(record.type)}
                          </span>
                          <span className="font-mono text-xs text-slate-700 dark:text-slate-200">
                            {formatTime(record.timestamp)}
                          </span>
                          <div className="flex-1">
                            {editingNote === record.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={noteText}
                                  onChange={(e) => setNoteText(e.target.value)}
                                  placeholder="Agregar nota..."
                                  className="flex-1 px-2 py-1 text-xs rounded border dark:bg-slate-700 dark:border-slate-600"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveNote(record.id);
                                    if (e.key === 'Escape') setEditingNote(null);
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">
                                  {record.notes || 'Sin notas'}
                                </span>
                                <button
                                  onClick={() => { 
                                    setEditingNote(record.id); 
                                    setNoteText(record.notes || ''); 
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Edit3 className="w-3 h-3 text-slate-500 hover:text-blue-500" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Sin registros este día</p>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRequestCorrection(selectedDay)}
                      className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950 text-xs"
                    >
                      <Send className="w-3 h-3 mr-2" />
                      Solicitar corrección de registro
                    </Button>
                  </div>
                </div>
              )}

              {/* Leyenda */}
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-950/50 border border-green-300" />
                  <span className="text-[10px] text-slate-500">Completo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-950/50 border border-yellow-300" />
                  <span className="text-[10px] text-slate-500">Incompleto</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-950/50 border border-red-300" />
                  <span className="text-[10px] text-slate-500">Sin registros</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  </div>
                  <span className="text-[10px] text-slate-500">E, SC, RC, S</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CorrectionRequestModal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        date={selectedDate}
      />
    </>
  );
}