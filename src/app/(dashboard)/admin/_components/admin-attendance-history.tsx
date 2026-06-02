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
    MapPin,
    X
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

    // Nuevo estado para el modal del calendario
    const [selectedDayDetails, setSelectedDayDetails] = useState<DayRecord | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const queryClient = useQueryClient();

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
        enabled: !isOwnAttendance,
        staleTime: 5 * 60 * 1000, 
    });

    const handleEditSave = async (data: any) => {
        queryClient.invalidateQueries({ queryKey: ['admin-attendance-history'] });
        // Opcional: Actualizar el modal abierto si lo deseas mantener abierto, o cerrarlo
        setEditingRecord(null);
        setSelectedDayDetails(null); 
    };

    const handleCreateRecord = async (data: any) => {
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

    const filteredRecords = typeFilter === 'all'
        ? records
        : records.map((day: DayRecord) => ({
            ...day,
            records: day.records.filter(r => r.type === typeFilter)
        })).filter((day: DayRecord) => day.records.length > 0);

    // --- LÓGICA DEL CALENDARIO ---
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); 
    
    const getRecordForDay = (day: number): DayRecord => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const found = filteredRecords.find((r: DayRecord) => {
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
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
                        <div className="grid grid-cols-7 gap-2">
                            {[...Array(35)].map((_, i) => (
                                <div key={i} className="animate-pulse h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
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
                                    const hasRecords = dayRecord.records.length > 0;
                                    const isFuture = new Date(dayRecord.date) > new Date();
                                    
                                    const cellColor = isFuture 
                                        ? 'bg-slate-50 dark:bg-slate-800/30 text-slate-400 cursor-default' 
                                        : hasRecords 
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800/50 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border'
                                            : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/50';

                                    return (
                                        <div 
                                            key={day} 
                                            onClick={() => !isFuture && setSelectedDayDetails(dayRecord)}
                                            className={`calendar-cell relative flex flex-col items-center justify-center p-2 h-20 sm:h-24 rounded-xl transition-all hover:shadow-md ${cellColor}`}
                                        >
                                            <span className="text-sm font-bold">{day}</span>
                                            {!isFuture && hasRecords && (
                                                <div className="mt-1 flex flex-col items-center">
                                                    <span className="text-[10px] font-medium opacity-80 whitespace-nowrap mb-1">
                                                        {dayRecord.records.length} {dayRecord.records.length === 1 ? 'reg' : 'regs'}
                                                    </span>
                                                    <div className="flex gap-0.5">
                                                        {/* Muestra hasta 3 puntitos indicando registros */}
                                                        {dayRecord.records.slice(0, 3).map((r, idx) => (
                                                            <div key={idx} className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                                                        ))}
                                                        {dayRecord.records.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-indigo-300" />}
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

            {/* Modal de Detalles del Día para el Admin */}
            {selectedDayDetails && (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 shrink-0">
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">{formatDate(selectedDayDetails.date)}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {selectedDayDetails.records.length} {selectedDayDetails.records.length === 1 ? 'registro' : 'registros'}
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedDayDetails(null)}
                                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            {selectedDayDetails.hoursWorked !== null && (
                                <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <span className="text-sm text-slate-500 dark:text-slate-400">Total horas computadas:</span>
                                    <span className="text-base font-bold text-slate-900 dark:text-white">{formatHoursWorked(selectedDayDetails.hoursWorked)}</span>
                                </div>
                            )}

                            {selectedDayDetails.records.length > 0 ? (
                                <div className="space-y-4">
                                    {selectedDayDetails.records.map((record) => (
                                        <div key={record.id} className="flex items-start gap-3 text-sm group p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <div className="mt-1">{getTypeIcon(record.type)}</div>
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <Badge className={getTypeBadgeColor(record.type)}>
                                                        {getTypeLabel(record.type)}
                                                    </Badge>
                                                    <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                        {formatTime(record.timestamp)}
                                                    </span>
                                                    {record.is_manual && (
                                                        <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/30">Manual</Badge>
                                                    )}
                                                </div>

                                                {!isOwnAttendance && (
                                                    <div className="flex items-center gap-1.5 mb-1 text-slate-700 dark:text-slate-300 font-medium">
                                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                                        {record.user_name}
                                                    </div>
                                                )}

                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    {record.notes || <span className="italic opacity-50">Sin notas registradas</span>}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                {record.latitude !== null && record.longitude !== null && (
                                                    <button 
                                                        onClick={() => setViewingLocation({ latitude: record.latitude!, longitude: record.longitude!, userName: record.user_name, timestamp: record.timestamp, type: record.type })}
                                                        className="p-1.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all shadow-sm" 
                                                        title="Ver ubicación"
                                                    >
                                                        <MapPin className="w-4 h-4 text-red-500" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => setEditingRecord(record)}
                                                    className="p-1.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all shadow-sm" 
                                                    title="Editar registro"
                                                >
                                                    <Edit3 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10">
                                    <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Sin registros para esta fecha</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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