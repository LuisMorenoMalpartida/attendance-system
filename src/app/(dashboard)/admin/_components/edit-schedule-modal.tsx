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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, Save, User, AlertCircle } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface DaySchedule {
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface EditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
  onSave: () => void;
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

const DEFAULT_SCHEDULES: DaySchedule[] = [
  { day_of_week: 1, day_name: 'Lunes', start_time: '08:00', end_time: '17:45', is_active: true },
  { day_of_week: 2, day_name: 'Martes', start_time: '08:00', end_time: '17:45', is_active: true },
  { day_of_week: 3, day_name: 'Miercoles', start_time: '08:00', end_time: '17:45', is_active: true },
  { day_of_week: 4, day_name: 'Jueves', start_time: '08:00', end_time: '17:45', is_active: true },
  { day_of_week: 5, day_name: 'Viernes', start_time: '08:00', end_time: '17:45', is_active: true },
  { day_of_week: 6, day_name: 'Sabado', start_time: '09:00', end_time: '12:00', is_active: true },
  { day_of_week: 0, day_name: 'Domingo', start_time: '08:00', end_time: '17:00', is_active: false },
];

export function EditScheduleModal({ isOpen, onClose, userId, userName, onSave }: EditScheduleModalProps) {
  const [schedules, setSchedules] = useState<DaySchedule[]>(DEFAULT_SCHEDULES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchSchedules();
    }
  }, [isOpen, userId]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/schedules`);
      if (response.ok) {
        const data = await response.json();
        if (data.schedules && data.schedules.length > 0) {
          const existing = data.schedules.map((s: any) => ({
            day_of_week: s.day_of_week,
            day_name: DAY_NAMES[s.day_of_week],
            start_time: s.start_time.substring(0, 5),
            end_time: s.end_time.substring(0, 5),
            is_active: s.is_active,
          }));

          const merged = DAY_NAMES.map((name, index) => {
            const found = existing.find((e: DaySchedule) => e.day_of_week === index);
            return found || {
              day_of_week: index,
              day_name: name,
              start_time: '08:00',
              end_time: '17:45',
              is_active: index !== 0,
            };
          });

          setSchedules(merged);
        }
      }
    } catch (error) {
      console.error('Error al cargar horarios:', error);
      setError('No se pudieron cargar los horarios');
    } finally {
      setLoading(false);
    }
  };

  useGSAP(() => {
    if (isOpen) {
      gsap.fromTo('.modal-content',
        { opacity: 0, scale: 0.9, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isOpen]);

  const updateSchedule = (dayOfWeek: number, field: keyof DaySchedule, value: any) => {
    setSchedules(prev => prev.map(s => 
      s.day_of_week === dayOfWeek ? { ...s, [field]: value } : s
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/schedules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedules: schedules.map(s => ({
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            is_active: s.is_active,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar');
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (type: 'standard' | 'halftime' | 'weekend') => {
    switch (type) {
      case 'standard':
        setSchedules(prev => prev.map(s => ({
          ...s,
          is_active: s.day_of_week >= 1 && s.day_of_week <= 6,
          start_time: s.day_of_week === 6 ? '09:00' : '08:00',
          end_time: s.day_of_week === 6 ? '12:00' : '17:45',
        })));
        break;
      case 'halftime':
        setSchedules(prev => prev.map(s => ({
          ...s,
          is_active: s.day_of_week >= 1 && s.day_of_week <= 5,
          start_time: '08:00',
          end_time: '12:00',
        })));
        break;
      case 'weekend':
        setSchedules(prev => prev.map(s => ({
          ...s,
          is_active: s.day_of_week === 5 || s.day_of_week === 6,
          start_time: '09:00',
          end_time: '17:00',
        })));
        break;
    }
  };

  const getDayColor = (dayOfWeek: number): string => {
    if (dayOfWeek === 0) return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30';
    if (dayOfWeek === 6) return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30';
    return 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="modal-content sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Editar Horario Laboral
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {userName}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Presets rapidos */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Configuraciones rapidas:
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('standard')}
                className="text-xs h-8"
              >
                Horario Estandar (L-V 8-17:45, S 9-12)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('halftime')}
                className="text-xs h-8"
              >
                Medio Tiempo (L-V 8-12)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('weekend')}
                className="text-xs h-8"
              >
                Fin de Semana (V-D 9-17)
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Configura el horario laboral para cada dia. Desactiva los dias que no trabaja.
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="animate-pulse h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule.day_of_week}
                  className={`p-4 rounded-xl border ${getDayColor(schedule.day_of_week)} transition-all`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={(checked) => updateSchedule(schedule.day_of_week, 'is_active', checked)}
                      />
                      <span className={`text-sm font-semibold ${schedule.is_active ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        {schedule.day_name}
                      </span>
                    </div>
                    {!schedule.is_active && (
                      <span className="text-xs text-slate-400">Descanso</span>
                    )}
                  </div>

                  {schedule.is_active && (
                    <div className="grid grid-cols-2 gap-3 ml-12">
                      <div className="space-y-1">
                        <Label className="text-xs">Hora de entrada</Label>
                        <Input
                          type="time"
                          value={schedule.start_time}
                          onChange={(e) => updateSchedule(schedule.day_of_week, 'start_time', e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Hora de salida</Label>
                        <Input
                          type="time"
                          value={schedule.end_time}
                          onChange={(e) => updateSchedule(schedule.day_of_week, 'end_time', e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {saving ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar Horarios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}