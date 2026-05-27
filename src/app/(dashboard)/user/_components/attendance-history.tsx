'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Coffee,
  AlertCircle,
  Edit3,
  Send,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CorrectionRequestModal } from './correction-request-modal';

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
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    fetchMonthRecords();
  }, [currentDate]);

  const fetchMonthRecords = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await fetch(`/api/attendance/history?year=${year}&month=${month}`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('Error al cargar historial:', error);
    } finally {
      setLoading(false);
    }
  };

  useGSAP(() => {
    gsap.fromTo('.history-row',
      { opacity: 0, x: -10 },
      { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
    );
  }, [records]);

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
      check_out: 'Salida',
    };
    return labels[type] || type;
  };

  const saveNote = async (recordId: number) => {
    try {
      await fetch(`/api/attendance/${recordId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: noteText }),
      });
      
      setEditingNote(null);
      fetchMonthRecords();
    } catch (error) {
      console.error('Error al guardar nota:', error);
    }
  };

  const formatHours = (hours: number | null): string => {
    if (hours === null) return '--:--';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Verificar si un día está incompleto (tiene entrada pero falta salida)
  const isDayIncomplete = (day: DayRecord): boolean => {
    const hasCheckIn = day.records.some(r => r.type === 'check_in');
    const hasCheckOut = day.records.some(r => r.type === 'check_out');
    return hasCheckIn && !hasCheckOut;
  };

  // Verificar si un día está ausente (sin registros)
  const isDayAbsent = (day: DayRecord): boolean => {
    return day.records.length === 0;
  };

  // Verificar si un día está completo
  const isDayComplete = (day: DayRecord): boolean => {
    const hasCheckIn = day.records.some(r => r.type === 'check_in');
    const hasCheckOut = day.records.some(r => r.type === 'check_out');
    return hasCheckIn && hasCheckOut;
  };

  const handleRequestCorrection = (date: string) => {
    setSelectedDate(date);
    setShowCorrectionModal(true);
  };

  const getDayStatusColor = (day: DayRecord): string => {
    if (isDayAbsent(day)) return 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900';
    if (isDayIncomplete(day)) return 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900';
    return 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800';
  };

  const getDayStatusBadge = (day: DayRecord) => {
    if (isDayAbsent(day)) {
      return <Badge variant="destructive" className="text-xs">Ausente</Badge>;
    }
    if (isDayIncomplete(day)) {
      return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">Incompleto</Badge>;
    }
    return <Badge variant="outline" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300">Completo</Badge>;
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="relative h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600" />
        
        <div className="p-6">
          {/* Header con navegación de mes */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Historial de Asistencia
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Si necesitas corregir algún registro, puedes solicitarlo en cualquier día
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              
              <button
                onClick={() => changeMonth(1)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>

          {/* Lista de registros */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                No hay registros este mes
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Los días sin registros aparecerán aquí para que puedas solicitar correcciones
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((day) => (
                <div
                  key={day.date}
                  className={`history-row rounded-xl p-4 transition-colors ${getDayStatusColor(day)}`}
                >
                  {/* Fecha y estado */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {new Date(day.date + 'T12:00:00').toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(day.date).toLocaleDateString('es-ES', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      {getDayStatusBadge(day)}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {day.hoursWorked !== null && (
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Horas</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {formatHours(day.hoursWorked)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Registros del día */}
                  {day.records.length > 0 ? (
                    <div className="space-y-2">
                      {day.records.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center gap-3 text-sm group"
                        >
                          {getTypeIcon(record.type)}
                          <span className="text-slate-600 dark:text-slate-400 min-w-[100px]">
                            {getTypeLabel(record.type)}
                          </span>
                          <span className="font-mono text-slate-900 dark:text-white">
                            {new Date(record.timestamp).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          
                          {/* Notas */}
                          <div className="flex-1">
                            {editingNote === record.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={noteText}
                                  onChange={(e) => setNoteText(e.target.value)}
                                  placeholder="Agregar nota..."
                                  className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveNote(record.id);
                                    if (e.key === 'Escape') setEditingNote(null);
                                  }}
                                  autoFocus
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
                                  className="opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-all"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mb-2">Sin registros este día</p>
                  )}

                  {/* Botón de solicitar corrección - SIEMPRE VISIBLE */}
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRequestCorrection(day.date)}
                      className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/50"
                    >
                      <Send className="w-3 h-3 mr-2" />
                      {isDayAbsent(day) 
                        ? 'Solicitar corrección (día sin registros)' 
                        : isDayIncomplete(day)
                        ? 'Solicitar corrección (falta completar)'
                        : 'Solicitar corrección de registro'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de solicitud de corrección */}
      <CorrectionRequestModal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        date={selectedDate}
      />
    </>
  );
}