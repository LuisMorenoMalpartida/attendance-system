'use client';

import { useState, useEffect } from 'react';
import {
    CheckCircle2,
    XCircle,
    Clock,
    Send,
    User,
    Calendar,
    Eye,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface CorrectionRequest {
    id: number;
    user_id: number;
    user_name: string;
    attendance_date: string;
    request_type: string;
    corrected_time: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by: number | null;
    review_notes: string | null;
    created_at: string;
}

// 👇 Interfaz para las props
interface CorrectionRequestsManagerProps {
    onStatusChange?: () => void;
}

// 👇 Usar la interfaz en el componente
export function CorrectionRequestsManager({ onStatusChange }: CorrectionRequestsManagerProps) {
    const [requests, setRequests] = useState<CorrectionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/correction-requests');
            if (response.ok) {
                const data = await response.json();
                setRequests(data.requests || []);
            }
        } catch (error) {
            console.error('Error al cargar solicitudes:', error);
        } finally {
            setLoading(false);
        }
    };

    useGSAP(() => {
        gsap.fromTo('.request-row',
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
        );
    }, [requests]);

    const handleApprove = async (requestId: number) => {
        setActionLoading(requestId);
        try {
            const response = await fetch(`/api/correction-requests/${requestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'approved',
                    review_notes: reviewNotes || 'Aprobado',
                }),
            });

            if (response.ok) {
                setReviewNotes('');
                fetchRequests();
                onStatusChange?.(); // 👈 Notificar al padre que cambió el estado
            }
        } catch (error) {
            console.error('Error al aprobar:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (requestId: number) => {
        if (!reviewNotes.trim()) {
            alert('Por favor, escribe un motivo de rechazo');
            return;
        }

        setActionLoading(requestId);
        try {
            const response = await fetch(`/api/correction-requests/${requestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'rejected',
                    review_notes: reviewNotes,
                }),
            });

            if (response.ok) {
                setReviewNotes('');
                fetchRequests();
                onStatusChange?.(); // 👈 Notificar al padre que cambió el estado
            }
        } catch (error) {
            console.error('Error al rechazar:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const getRequestTypeLabel = (type: string): string => {
        const labels: Record<string, string> = {
            missing_check_in: 'Olvidó marcar entrada',
            missing_check_out: 'Olvidó marcar salida',
            missing_lunch_out: 'Olvidó marcar salida comida',
            missing_lunch_in: 'Olvidó marcar regreso comida',
            wrong_time: 'Hora incorrecta',
        };
        return labels[type] || type;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">Pendiente</Badge>;
            case 'approved':
                return <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Aprobada</Badge>;
            case 'rejected':
                return <Badge variant="destructive">Rechazada</Badge>;
            default:
                return null;
        }
    };

    const filteredRequests = requests.filter(r => 
        statusFilter === 'all' ? true : r.status === statusFilter
    );

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="relative h-1 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600" />
            
            <div className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            Solicitudes de Corrección
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {pendingCount} solicitud(es) pendiente(s)
                        </p>
                    </div>

                    <div className="flex gap-2">
                        {[
                            { value: 'pending', label: 'Pendientes', color: 'border-yellow-300 bg-yellow-50' },
                            { value: 'approved', label: 'Aprobadas', color: 'border-green-300 bg-green-50' },
                            { value: 'rejected', label: 'Rechazadas', color: 'border-red-300 bg-red-50' },
                            { value: 'all', label: 'Todas', color: 'border-slate-300 bg-slate-50' },
                        ].map(filter => (
                            <button
                                key={filter.value}
                                onClick={() => setStatusFilter(filter.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                    statusFilter === filter.value
                                        ? `${filter.color} text-slate-900 dark:text-white`
                                        : 'border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                {filter.label}
                                {filter.value === 'pending' && pendingCount > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-yellow-400 text-white text-xs">
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-12">
                        <Send className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">
                            No hay solicitudes {statusFilter !== 'all' ? statusFilter : ''}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredRequests.map((request) => (
                            <div
                                key={request.id}
                                className="request-row bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                            <User className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                {request.user_name}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {getRequestTypeLabel(request.request_type)}
                                            </p>
                                        </div>
                                    </div>
                                    {getStatusBadge(request.status)}
                                </div>

                                <div className="space-y-2 ml-13">
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-1 text-slate-500">
                                            <Calendar className="w-3 h-3" />
                                            <span>
                                                {new Date(request.attendance_date + 'T12:00:00').toLocaleDateString('es-ES', {
                                                    weekday: 'long',
                                                    day: 'numeric',
                                                    month: 'long'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-500">
                                            <Clock className="w-3 h-3" />
                                            <span className="font-mono">{request.corrected_time}</span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                                        &ldquo;{request.reason}&rdquo;
                                    </p>

                                    <button
                                        onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                                    >
                                        <Eye className="w-3 h-3" />
                                        {expandedId === request.id ? 'Ocultar acciones' : 'Gestionar'}
                                        {expandedId === request.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>

                                    {expandedId === request.id && request.status === 'pending' && (
                                        <div className="pt-3 space-y-3 border-t border-slate-200 dark:border-slate-700">
                                            <Textarea
                                                value={reviewNotes}
                                                onChange={(e) => setReviewNotes(e.target.value)}
                                                placeholder="Notas de revisión (obligatorio para rechazar)..."
                                                rows={2}
                                                className="text-xs"
                                            />

                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApprove(request.id)}
                                                    disabled={actionLoading === request.id}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    {actionLoading === request.id ? (
                                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                                    ) : (
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    )}
                                                    Aprobar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleReject(request.id)}
                                                    disabled={actionLoading === request.id}
                                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                                >
                                                    {actionLoading === request.id ? (
                                                        <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-1" />
                                                    ) : (
                                                        <XCircle className="w-3 h-3 mr-1" />
                                                    )}
                                                    Rechazar
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {request.status !== 'pending' && (
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                            <p className="text-xs text-slate-500">
                                                <strong>Revisión:</strong> {request.review_notes || 'Sin notas'}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {new Date(request.created_at).toLocaleDateString('es-ES', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}