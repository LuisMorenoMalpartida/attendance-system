'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, LogIn, LogOut, Coffee, AlertCircle, Edit3, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CorrectionRequestModal } from './correction-request-modal';
import { formatTime, formatDate, formatHoursWorked, formatMonthYear } from '@/lib/date-utils';

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
  
  const [selectedDayDetails, setSelectedDayDetails] = useState<DayRecord | null>(null);

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

  useGSAP(() => { 
    gsap.fromTo('.calendar-cell', 
      { opacity: 0, scale: 0.9 }, 
      { opacity: 1, scale: 1, duration: 0.3, stagger: 0.02, ease: 'back.out(1.5)' }
    ); 
  }, [records, currentDate]);

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'check_in': return <LogIn className="w-4 h-4 text-blue-500" />;
      case 'lunch_out': return <Coffee className="w-4 h-4 text-orange-500" />;
      case 'lunch_in': return <Coffee className="w-4 h-4 text-green-500" />;
      case 'check_out': return <LogOut className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4" />;
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
      
      if (selectedDayDetails) {
        setSelectedDayDetails(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            records: prev.records.map(r => r.id === recordId ? { ...r, notes: noteText } : r)
          };
        });
      }
    } catch (error) { 
      console.error('Error al guardar nota:', error); 
    }
  };

  const isDayIncomplete = (day: DayRecord): boolean => { 
    const hasCheckIn = day.records.some(r => r.type === 'check_in'); 
    const hasCheckOut = day.records.some(r => r.type === 'check_out'); 
    return hasCheckIn && !hasCheckOut; 
  };
  
  const isDayAbsent = (day: DayRecord): boolean => day.records.length === 0;
  
  const handleRequestCorrection = (date: string) => { 
    setSelectedDate(date); 
    setShowCorrectionModal(true); 
    setSelectedDayDetails(null); 
  };

  const getDayStatusColor = (day: DayRecord): string => {
    if (isDayAbsent(day)) return 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 border-red-200 text-red-700';
    if (isDayIncomplete(day)) return 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/30 border-yellow-200 text-yellow-700';
    return 'bg-green-50 hover:bg-green-100 dark:bg-green-900/20 border-green-200 text-green-700';
  };

  const getDayStatusBadge = (day: DayRecord) => {
    if (isDayAbsent(day)) return <Badge variant="destructive" className="text-xs">Ausente</Badge>;
    if (isDayIncomplete(day)) return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">Incompleto</Badge>;
    return <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">Completo</Badge>;
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); 
  
  // 👇 AQUÍ ESTÁ LA CORRECCIÓN: Separar la fecha para hacer coincidir correctamente 
  const getRecordForDay = (day: number): DayRecord => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const found = records.find((r: DayRecord) => {
      // Nos aseguramos de comparar solo la parte YYYY-MM-DD
      const recordDate = r.date.split('T')[0]; 
      return recordDate === dateStr;
    });
    
    return found || { date: dateStr, records: [], hoursWorked: null };
  };

  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blankDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
        <div className="relative h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600" />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold">Historial de Asistencia</h2>
              <p className="text-xs text-slate-500 mt-1">Selecciona un día para ver los detalles o solicitar correcciones</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-5 h-5" /></button>
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">{formatMonthYear(currentDate)}</span>
              </div>
              <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-slate-100"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-7 gap-2">
              {[...Array(35)].map((_, i) => (
                <div key={i} className="animate-pulse h-20 bg-slate-100 rounded-xl" />
              ))}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-400 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {blankDays.map(blank => (
                  <div key={`blank-${blank}`} className="h-20 sm:h-24 rounded-xl bg-slate-50/50 dark:bg-slate-800/10" />
                ))}
                
                {calendarDays.map(day => {
                  const dayRecord = getRecordForDay(day);
                  const isFuture = new Date(dayRecord.date) > new Date();
                  const cellColor = isFuture 
                    ? 'bg-slate-50 dark:bg-slate-800/30 text-slate-400 cursor-default' 
                    : `${getDayStatusColor(dayRecord)} cursor-pointer border`;

                  return (
                    <div 
                      key={day} 
                      onClick={() => !isFuture && setSelectedDayDetails(dayRecord)}
                      className={`calendar-cell relative flex flex-col items-center justify-center p-2 h-20 sm:h-24 rounded-xl transition-all hover:shadow-md ${cellColor}`}
                    >
                      <span className="text-sm font-bold">{day}</span>
                      {!isFuture && (
                        <div className="mt-1 flex flex-col items-center">
                          {/* Muestra de horas en el calendario */}
                          {dayRecord.hoursWorked !== null && (
                            <span className="text-[10px] font-medium opacity-80 whitespace-nowrap">
                              {formatHoursWorked(dayRecord.hoursWorked)}
                            </span>
                          )}
                          <div className="mt-1">
                            {isDayAbsent(dayRecord) ? (
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                            ) : isDayIncomplete(dayRecord) ? (
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedDayDetails && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <p className="font-semibold">{formatDate(selectedDayDetails.date)}</p>
                {getDayStatusBadge(selectedDayDetails)}
              </div>
              <button 
                onClick={() => setSelectedDayDetails(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Muestra de horas en el modal */}
              {selectedDayDetails.hoursWorked !== null && (
                <div className="mb-4 pb-4 border-b flex justify-between items-center">
                  <span className="text-sm text-slate-500">Horas trabajadas:</span>
                  <span className="text-base font-bold">{formatHoursWorked(selectedDayDetails.hoursWorked)}</span>
                </div>
              )}

              {selectedDayDetails.records.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {selectedDayDetails.records.map((record) => (
                    <div key={record.id} className="flex items-start gap-3 text-sm group">
                      <div className="mt-0.5">{getTypeIcon(record.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-slate-700 dark:text-slate-200">{getTypeLabel(record.type)}</span>
                          <span className="font-mono text-slate-500">{formatTime(record.timestamp)}</span>
                        </div>
                        
                        {editingNote === record.id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <input 
                              type="text" 
                              value={noteText} 
                              onChange={(e) => setNoteText(e.target.value)} 
                              placeholder="Agregar nota..."
                              className="flex-1 px-3 py-1.5 text-xs rounded-md border focus:ring-2 focus:ring-blue-500 outline-none" 
                              autoFocus
                              onKeyDown={(e) => { 
                                if (e.key === 'Enter') saveNote(record.id); 
                                if (e.key === 'Escape') setEditingNote(null); 
                              }} 
                            />
                            <Button size="sm" onClick={() => saveNote(record.id)} className="h-7 text-xs">Guardar</Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mt-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <span className="text-xs text-slate-500">{record.notes || 'Sin notas'}</span>
                            <button 
                              onClick={() => { setEditingNote(record.id); setNoteText(record.notes || ''); }} 
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
                            >
                              <Edit3 className="w-3 h-3 text-slate-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Sin registros este día</p>
                </div>
              )}

              <Button 
                variant="outline" 
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
                onClick={() => handleRequestCorrection(selectedDayDetails.date)}
              >
                <Send className="w-4 h-4 mr-2" />
                {isDayAbsent(selectedDayDetails) 
                  ? 'Solicitar corrección (día vacío)' 
                  : isDayIncomplete(selectedDayDetails) 
                    ? 'Completar registros' 
                    : 'Solicitar corrección'
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      <CorrectionRequestModal isOpen={showCorrectionModal} onClose={() => setShowCorrectionModal(false)} date={selectedDate} />
    </>
  );
}

//comentario XD