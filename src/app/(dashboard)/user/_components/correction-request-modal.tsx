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
import { AlertCircle, Send, Clock, Calendar } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface CorrectionRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: string;
}

export function CorrectionRequestModal({ isOpen, onClose, date }: CorrectionRequestModalProps) {
    const [formData, setFormData] = useState({
        requestType: 'missing_check_out',
        correctedTime: '',
        reason: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useGSAP(() => {
        if (isOpen) {
            gsap.fromTo('.modal-content',
                { opacity: 0, scale: 0.9, y: 20 },
                { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'power2.out' }
            );
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.correctedTime || !formData.reason) {
            setError('Todos los campos son requeridos');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/correction-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attendance_date: date,
                    request_type: formData.requestType,
                    corrected_time: formData.correctedTime,
                    reason: formData.reason,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al enviar solicitud');
            }

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setFormData({ requestType: 'missing_check_out', correctedTime: '', reason: '' });
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const requestTypes = [
        { value: 'missing_check_in', label: 'Olvidé marcar entrada' },
        { value: 'missing_check_out', label: 'Olvidé marcar salida' },
        { value: 'missing_lunch_out', label: 'Olvidé marcar salida comida' },
        { value: 'missing_lunch_in', label: 'Olvidé marcar regreso comida' },
        { value: 'wrong_time', label: 'Hora incorrecta' },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="modal-content sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-blue-600" />
                        Solicitar Corrección
                    </DialogTitle>
                    <DialogDescription>
                        Fecha: {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                        })}
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
                            <Send className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                            ¡Solicitud enviada!
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                            El administrador revisará tu solicitud
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Tipo de corrección</Label>
                            <Select
                                value={formData.requestType}
                                onValueChange={(value) => setFormData({ ...formData, requestType: value ?? 'missing_check_out' })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {requestTypes.map(type => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Hora correcta
                            </Label>
                            <Input
                                type="time"
                                value={formData.correctedTime}
                                onChange={(e) => setFormData({ ...formData, correctedTime: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Motivo</Label>
                            <Textarea
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="Explica por qué necesitas esta corrección..."
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-gradient-to-r from-blue-600 to-purple-600"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                ) : (
                                    <Send className="w-4 h-4 mr-2" />
                                )}
                                Enviar Solicitud
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}