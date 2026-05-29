'use client';

import { useState } from 'react';
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
    User,
    Filter,
    Download,
    Plus,
    MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LocationViewer } from './location-viewer';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EditAttendanceModal } from './edit-attendance-modal';
import { CreateManualRecord } from './create-manual-record';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { formatTime, formatDate, formatHoursWorked, formatMonthYear } from '@/lib/date-utils';

interface AttendanceRecord {
    id: number;
    user_id: number;
    user_name: string;
    type: 'check_in' | 'lunch_out' | 'lunch_in' | 'check_out';
    timestamp: string;
    notes: string | null;
    is_manual: boolean;
    latitude: number | null;
    longitude: number | null;
}

interface DayRecord {
    date: string;
    records: AttendanceRecord[];
    hoursWorked: number | null;
}

interface AdminAttendanceHistoryProps {
    isOwnAttendance: boolean;
}

export function AdminAttendanceHistory({ isOwnAttendance }: AdminAttendanceHistoryProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [typeFilter, setTypeFilter] = useState('all');
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [viewingLocation, setViewingLocation] = useState<{
        latitude: number;
        longitude: number;
        userName: string;
        timestamp: string;
        type: string;
    } | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const queryClient = useQueryClient();

    // 👇 USAR REACT QUERY CON LA MISMA QUERY KEY QUE INVALIDAMOS
    const { data: records = [], isLoading: loading, refetch: fetchRecords } = useQuery({
        queryKey: ['admin-attendance-history', year, month, isOwnAttendance],
        queryFn: async () => {
            const params = new URLSearchParams({
                year: year.toString(),
                month: month.toString(),
                ...(isOwnAttendance ? { own: 'true' } : {}),
            });

            const response = await fetch(`/api/admin/attendance?${params}`);
            if (!response.ok) throw new Error('Error al cargar historial');
            const data = await response.json();
            return data.records || [];
        },
        staleTime: 30_000,
    });

    // 👇 Fetch de usuarios (sin cambios, solo se necesita para admin no propio)
    const { data: users = [] } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const response = await fetch('/api/admin/users?active=true');
            if (response.ok) {
                const data = await response.json();
                return data.users || [];
            }
            return [];
        },
        enabled: !isOwnAttendance, // Solo ejecutar si no es asistencia propia
        staleTime: 5 * 60 * 1000, // 5 minutos de caché
    });

    const handleEditSave = async (data: any) => {
        // 👇 Invalidar para refrescar después de editar
        queryClient.invalidateQueries({ queryKey: ['admin-attendance-history'] });
    };

    const handleCreateRecord = async (data: any) => {
        // 👇 Invalidar para refrescar después de crear
        queryClient.invalidateQueries({ queryKey: ['admin-attendance-history'] });
    };

    const handleExportCSV = () => {
        const csvData = records.flatMap((day: DayRecord) =>
            day.records.map((record: AttendanceRecord) => ({
                Fecha: day.date,
                Usuario: record.user_name,
                Tipo: getTypeLabel(record.type),
                Hora: formatTime(record.timestamp),
                Manual: record.is_manual ? 'Sí' : 'No',
                Notas: record.notes || '',
            }))
        );

        if (csvData.length === 0) return;

        // Tipar correctamente los valores
        const headers = Object.keys(csvData[0]);
        const csv = [
            headers.join(','),
            ...csvData.map((row: Record<string, string>) => headers.map(header => row[header]).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `asistencia_${year}_${month}.csv`;
        a.click();
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

    const getTypeBadgeColor = (type: string): string => {
        const colors: Record<string, string> = {
            check_in: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
            lunch_out: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
            lunch_in: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
            check_out: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
        };
        return colors[type] || '';
    };

    // Filtrar registros por tipo
    const filteredRecords = typeFilter === 'all'
        ? records
        : records.map((day: DayRecord) => ({
            ...day,
            records: day.records.filter(r => r.type === typeFilter)
        })).filter((day: DayRecord) => day.records.length > 0);

    return (
        <>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="relative h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600" />

                <div className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {isOwnAttendance ? 'Mi Historial' : 'Todos los Registros'}
                            </h2>
                            {!isOwnAttendance && (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Gestiona los registros de todos los usuarios
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>

                            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                                <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {formatMonthYear(currentDate)}
                                </span>
                            </div>

                            <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {!isOwnAttendance && (
                        <div className="flex flex-col sm:flex-row gap-3 mb-6">
                            <Button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                                <Plus className="w-4 h-4 mr-2" />Crear Registro Manual
                            </Button>
                            <Button variant="outline" onClick={handleExportCSV}>
                                <Download className="w-4 h-4 mr-2" />Exportar CSV
                            </Button>
                            <div className="flex-1" />
                            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value ?? 'all')}>
                                <SelectTrigger className="w-40">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Filtrar tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los tipos</SelectItem>
                                    <SelectItem value="check_in">Entrada</SelectItem>
                                    <SelectItem value="lunch_out">Salida comida</SelectItem>
                                    <SelectItem value="lunch_in">Regreso comida</SelectItem>
                                    <SelectItem value="check_out">Salida</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="animate-pulse"><div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl" /></div>
                            ))}
                        </div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="text-center py-12">
                            <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-500 dark:text-slate-400">No hay registros este mes</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredRecords.map((day: DayRecord) => (
                                <div key={day.date} className="history-row bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                {formatDate(day.date)}
                                            </p>
                                        </div>
                                        {day.hoursWorked !== null && (
                                            <div className="text-right">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Horas trabajadas</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {formatHoursWorked(day.hoursWorked)}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {day.records.map((record) => (
                                            <div key={record.id} className="flex items-center gap-3 text-sm group">
                                                {getTypeIcon(record.type)}
                                                <Badge className={getTypeBadgeColor(record.type)}>{getTypeLabel(record.type)}</Badge>

                                                {!isOwnAttendance && (
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[100px]">
                                                        <User className="w-3 h-3 inline mr-1" />{record.user_name}
                                                    </span>
                                                )}

                                                <span className="font-mono text-slate-900 dark:text-white">
                                                    {formatTime(record.timestamp)}
                                                </span>

                                                {record.is_manual && (
                                                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">Manual</Badge>
                                                )}

                                                <div className="flex-1">
                                                    <span className="text-xs text-slate-400">{record.notes || 'Sin notas'}</span>
                                                </div>

                                                {record.latitude !== null && record.longitude !== null && (
                                                    <button onClick={() => setViewingLocation({ latitude: record.latitude!, longitude: record.longitude!, userName: record.user_name, timestamp: record.timestamp, type: record.type })}
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 transition-all" title="Ver ubicación">
                                                        <MapPin className="w-4 h-4 text-red-500" />
                                                    </button>
                                                )}

                                                <button onClick={() => setEditingRecord(record)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 transition-all" title="Editar registro">
                                                    <Edit3 className="w-4 h-4 text-slate-600" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {editingRecord && (
                <EditAttendanceModal isOpen={!!editingRecord} onClose={() => setEditingRecord(null)} record={editingRecord} onSave={handleEditSave} />
            )}

            <CreateManualRecord isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreateRecord} />

            {viewingLocation && (
                <LocationViewer isOpen={!!viewingLocation} onClose={() => setViewingLocation(null)}
                    latitude={viewingLocation.latitude} longitude={viewingLocation.longitude}
                    userName={viewingLocation.userName} timestamp={viewingLocation.timestamp} type={viewingLocation.type} />
            )}
        </>
    );
}