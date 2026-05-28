'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, Clock, Edit3, Save } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { toPeruTimestamp } from '@/lib/date-utils';

interface EditAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: {
    id: number;
    user_id: number;
    user_name: string;
    type: string;
    timestamp: string;
    notes: string | null;
  } | null;
  onSave: (data: any) => void;
}

export function EditAttendanceModal({ isOpen, onClose, record, onSave }: EditAttendanceModalProps) {
  const [formData, setFormData] = useState({
    type: record?.type || 'check_in',
    timestamp: record?.timestamp ? toPeruTimestamp(record.timestamp).slice(0, 16) : '',
    notes: record?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useGSAP(() => {
    if (isOpen) {
      gsap.fromTo('.modal-content',
        { opacity: 0, scale: 0.9, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!record) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/attendance/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          // Enviar como naive Peru timestamp
          timestamp: formData.timestamp.length === 16 ? `${formData.timestamp}:00` : formData.timestamp,
          notes: formData.notes,
          is_manual: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar');
      }

      onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="modal-content sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-amber-600" />
            Editar Registro
          </DialogTitle>
          <DialogDescription>
            Modificar registro de asistencia de <strong>{record?.user_name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Tipo de Registro</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => {
                if (!value) return;

                setFormData({
                  ...formData,
                  type: value,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="check_in">Entrada</SelectItem>
                <SelectItem value="lunch_out">Salida Comida</SelectItem>
                <SelectItem value="lunch_in">Regreso Comida</SelectItem>
                <SelectItem value="check_out">Salida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fecha y Hora</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="datetime-local"
                value={formData.timestamp}
                onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Agregar nota (opcional)"
              rows={3}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar Cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}