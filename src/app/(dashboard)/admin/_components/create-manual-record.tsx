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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Plus, Save, User } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { getPeruNowTimestamp } from '@/lib/date-utils';

interface CreateManualRecordProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: any) => void;
}

interface UserOption {
    id: number;
    name: string;
}

interface FormData {
    userId: string;
    type: 'check_in' | 'lunch_out' | 'lunch_in' | 'check_out';
    timestamp: string;
    notes: string;
    latitude: string;
    longitude: string;
}

export function CreateManualRecord({
    isOpen,
    onClose,
    onCreate,
}: CreateManualRecordProps) {
    const [users, setUsers] = useState<UserOption[]>([]);

    const [formData, setFormData] = useState<FormData>({
        userId: '',
        type: 'check_in',
        timestamp: getPeruNowTimestamp().slice(0, 16),
        notes: '',
        latitude: '',
        longitude: '',
    });

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users?active=true');

            if (!response.ok) {
                throw new Error('Error al obtener usuarios');
            }

            const data = await response.json();

            const safeUsers: UserOption[] = (data.users ?? []).filter(
                (user: UserOption) =>
                    typeof user.id === 'number' &&
                    typeof user.name === 'string'
            );

            setUsers(safeUsers);
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            setError('No se pudieron cargar los usuarios');
        }
    };

    useGSAP(
        () => {
            if (isOpen) {
                gsap.fromTo(
                    '.modal-content',
                    {
                        opacity: 0,
                        scale: 0.9,
                        y: 20,
                    },
                    {
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        duration: 0.3,
                        ease: 'power2.out',
                    }
                );
            }
        },
        [isOpen]
    );

    const handleCreate = async () => {
        if (!formData.userId) {
            setError('Selecciona un usuario');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const payload = {
                user_id: Number(formData.userId),
                type: formData.type,
                // El input `datetime-local` devuelve una hora sin zona.
                // Enviamos la cadena como 'YYYY-MM-DDTHH:MM:SS' (naive, hora local/Perú)
                timestamp: formData.timestamp.length === 16 ? `${formData.timestamp}:00` : formData.timestamp,
                notes: formData.notes.trim(),
                latitude: formData.latitude
                    ? parseFloat(formData.latitude)
                    : null,
                longitude: formData.longitude
                    ? parseFloat(formData.longitude)
                    : null,
                is_manual: true,
            };

            const response = await fetch('/api/admin/attendance/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al crear registro');
            }

            onCreate(data);
            onClose();
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : 'Error inesperado';

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="modal-content sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5 text-emerald-600" />
                        Crear Registro Manual
                    </DialogTitle>

                    <DialogDescription>
                        Registrar asistencia manualmente para un usuario
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50">
                            <AlertCircle className="h-4 w-4 text-red-500" />

                            <p className="text-sm text-red-700 dark:text-red-400">
                                {error}
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Usuario
                        </Label>

                        <Select
                            value={formData.userId}
                            onValueChange={(value) => {
                                if (!value) return;

                                setFormData((prev) => ({
                                    ...prev,
                                    userId: value,
                                }));
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar usuario" />
                            </SelectTrigger>

                            <SelectContent>
                                {users.map((user) => (
                                    <SelectItem
                                        key={user.id}
                                        value={String(user.id)}
                                    >
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Tipo de Registro</Label>

                        <Select
                            value={formData.type}
                            onValueChange={(value) => {
                                if (!value) return;

                                setFormData((prev) => ({
                                    ...prev,
                                    type: value as FormData['type'],
                                }));
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="check_in">
                                    Entrada
                                </SelectItem>

                                <SelectItem value="lunch_out">
                                    Salida Comida
                                </SelectItem>

                                <SelectItem value="lunch_in">
                                    Regreso Comida
                                </SelectItem>

                                <SelectItem value="check_out">
                                    Salida
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Fecha y Hora</Label>

                        <Input
                            type="datetime-local"
                            value={formData.timestamp}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    timestamp: e.target.value,
                                }))
                            }
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Latitud</Label>

                            <Input
                                type="number"
                                step="any"
                                placeholder="Ej: 19.4326"
                                value={formData.latitude}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        latitude: e.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Longitud</Label>

                            <Input
                                type="number"
                                step="any"
                                placeholder="Ej: -99.1332"
                                value={formData.longitude}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        longitude: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notas</Label>

                        <Textarea
                            rows={3}
                            placeholder="Razón del registro manual (opcional)"
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    notes: e.target.value,
                                }))
                            }
                        />
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50">
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            ⚠️ Este registro se marcará como manual y quedará
                            registrado en la auditoría.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>

                        <Button
                            onClick={handleCreate}
                            disabled={loading || !formData.userId}
                            className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                        >
                            {loading ? (
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}

                            Crear Registro
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}