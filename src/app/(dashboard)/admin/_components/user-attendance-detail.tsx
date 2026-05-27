'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Edit3,
  Coffee,
  LogIn,
  LogOut,
  ArrowLeft,
  Download,
} from 'lucide-react';
import { EditAttendanceModal } from './edit-attendance-modal';
import { LocationViewer } from './location-viewer';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface UserAttendanceDetailProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
}

interface DayRecord {
  date: string;
  records: Array<{
    id: number;
    type: string;
    timestamp: string;
    notes: string | null;
    is_manual: boolean;
    latitude: number | null;
    longitude: number | null;
  }>;
  hoursWorked: number | null;
}

export function UserAttendanceDetail({ isOpen, onClose, userId, userName }: UserAttendanceDetailProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [viewingLocation, setViewingLocation] = useState<{
    latitude: number;
    longitude: number;
    userName: string;
    timestamp: string;
    type: string;
  } | null>(null);
  const [stats, setStats] = useState({
    totalHours: 0,
    averageCheckIn: '--:--',
    lateArrivals: 0,
    daysWorked: 0,
  });

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserRecords();
    }
  }, [isOpen, userId, currentDate]);

  const fetchUserRecords = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const response = await fetch(
        `/api/admin/users/${userId}/attendance?year=${year}&month=${month}`
      );

      if (response.ok) {
        const data = await response.json();
        setRecords(data.records || []);
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Error al cargar registros:', error);
    } finally {
      setLoading(false);
    }
  };

  useGSAP(() => {
    if (isOpen) {
      gsap.fromTo('.modal-content',
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isOpen]);

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  const handleEditSave = async () => {
    await fetchUserRecords();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'check_in': return <LogIn className="w-4 h-4 text-blue-500" />;
      case 'lunch_out': return <Coffee className="w-4 h-4 text-orange-500" />;
      case 'lunch_in': return <Coffee className="w-4 h-4 text-green-500" />;
      case 'check_out': return <LogOut className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4" />;
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

  const formatHours = (hours: number | null): string => {
    if (hours === null) return '--:--';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="modal-content sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  {userName}
                </DialogTitle>
                <DialogDescription>
                  Historial de asistencia
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Resumen de stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50">
                <p className="text-xs text-blue-600 dark:text-blue-400">Días trabajados</p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-200">{stats.daysWorked}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50">
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Horas totales</p>
                <p className="text-lg font-bold text-emerald-900 dark:text-emerald-200">{stats.totalHours}h</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50">
                <p className="text-xs text-purple-600 dark:text-purple-400">Entrada prom.</p>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-200">{stats.averageCheckIn}</p>
              </div>
              <div className={`p-3 rounded-xl ${stats.lateArrivals > 0 ? 'bg-red-50 dark:bg-red-950/50' : 'bg-green-50 dark:bg-green-950/50'}`}>
                <p className={`text-xs ${stats.lateArrivals > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  Llegadas tarde
                </p>
                <p className={`text-lg font-bold ${stats.lateArrivals > 0 ? 'text-red-900 dark:text-red-200' : 'text-green-900 dark:text-green-200'}`}>
                  {stats.lateArrivals}
                </p>
              </div>
            </div>

            {/* Navegación de mes */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeMonth(-1)}
              >
                Mes anterior
              </Button>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-medium">
                  {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => changeMonth(1)}
              >
                Mes siguiente
              </Button>
            </div>

            {/* Lista de registros */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">
                  No hay registros este mes
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {records.map((day) => (
                  <div
                    key={day.date}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {new Date(day.date + 'T12:00:00').toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      {day.hoursWorked !== null && (
                        <Badge variant="outline">
                          {formatHours(day.hoursWorked)}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      {day.records.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center gap-2 text-sm group"
                        >
                          {getTypeIcon(record.type)}
                          <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[90px]">
                            {getTypeLabel(record.type)}
                          </span>
                          <span className="font-mono text-xs">
                            {new Date(record.timestamp).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          {record.is_manual && (
                            <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">
                              Manual
                            </Badge>
                          )}

                          {record.latitude !== null && record.longitude !== null && (
                            <button
                              onClick={() =>
                                setViewingLocation({
                                  latitude: record.latitude!,
                                  longitude: record.longitude!,
                                  userName,
                                  timestamp: record.timestamp,
                                  type: record.type,
                                })
                              }
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                              title="Ver ubicación"
                            >
                              <MapPin className="w-3 h-3 text-red-500" />
                            </button>
                          )}

                          <span className="text-xs text-slate-400 flex-1 truncate">
                            {record.notes || ''}
                          </span>

                          <button
                            onClick={() => setEditingRecord({ ...record, user_id: userId, user_name: userName })}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de edición */}
      {editingRecord && (
        <EditAttendanceModal
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          record={editingRecord}
          onSave={handleEditSave}
        />
      )}

      {viewingLocation && (
        <LocationViewer
          isOpen={!!viewingLocation}
          onClose={() => setViewingLocation(null)}
          {...viewingLocation}
        />
      )}
    </>
  );
}