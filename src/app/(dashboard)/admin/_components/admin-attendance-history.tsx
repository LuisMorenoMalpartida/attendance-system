'use client';

import { useState, useMemo } from 'react';
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
    Clock
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
import { formatTime, formatDate, formatHoursWorked } from '@/lib/date-utils';
import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    isSameMonth,
    isToday,
    parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';

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
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const queryClient = useQueryClient();

    const { data: records = [], isLoading: loading } = useQuery({
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

    // Convertir records a un Map para acceso rápido por fecha
    const recordsMap = useMemo(() => {
        const map = new Map<string, DayRecord>();
        records.forEach((record: DayRecord) => {
            try {
                const key = record.date ? format(parseISO(record.date), 'yyyy-MM-dd') : record.date;
                map.set(key, record);
            } catch (e) {
                map.set(record.date, record);
            }
        });
        return map;
    }, [records]);

    // Generar días del calendario
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

        return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }, [currentDate]);

    // Día seleccionado para ver detalles
    const selectedDayData = selectedDay ? recordsMap.get(selectedDay) : null;

    const handleEditSave = async (data: any) => {
        queryClient.invalidateQueries({ queryKey: ['admin-attendance-history'] });
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
        gsap.fromTo('.calendar-day',
            { opacity: 0, scale: 0.8 },
            { opacity: 1, scale: 1, duration: 0.3, stagger: 0.02, ease: 'back.out(1.7)' }
        );
    }, [calendarDays]);

    const changeMonth = (increment: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + increment);
        setCurrentDate(newDate);
        setSelectedDay(null);
    };

    const getTypeIcon = (type: string, size: 'sm' | 'md' = 'md') => {
        const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
        switch (type) {
            case 'check_in': return <LogIn className={`${iconSize} text-blue-500`} />;
            case 'lunch_out': return <Coffee className={`${iconSize} text-orange-500`} />;
            case 'lunch_in': return <Coffee className={`${iconSize} text-green-500`} />;
            case 'check_out': return <LogOut className={`${iconSize} text-red-500`} />;
            default: return <AlertCircle className={iconSize} />;
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

    const getDayStatusColor = (date: Date): string => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayData = recordsMap.get(dateStr);
        
        if (!isSameMonth(date, currentDate)) return 'opacity-30';
        if (!dayData || dayData.records.length === 0) return 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/30';
        
        const hasCheckIn = dayData.records.some(r => r.type === 'check_in');
        const hasCheckOut = dayData.records.some(r => r.type === 'check_out');
        
        if (hasCheckIn && !hasCheckOut) return 'bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/30';
        if (hasCheckIn && hasCheckOut) return 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/30';
        return 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/30';
    };

    const getDayIndicator = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayData = recordsMap.get(dateStr);
        
        if (!isSameMonth(date, currentDate) || !dayData) return null;
        
        const types = dayData.records.map(r => r.type);
        const hasCheckIn = types.includes('check_in');
        const hasLunchOut = types.includes('lunch_out');
        const hasLunchIn = types.includes('lunch_in');
        const hasCheckOut = types.includes('check_out');
        
        return (
            <div className="flex gap-0.5 mt-1">
                {hasCheckIn && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Entrada" />}
                {hasLunchOut && <div className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Salida comida" />}
                {hasLunchIn && <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Regreso comida" />}
                {hasCheckOut && <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="Salida" />}
            </div>
        );
    };

    // Filtrar registros del día seleccionado
    const filteredDayRecords = selectedDayData && typeFilter !== 'all'
        ? selectedDayData.records.filter(r => r.type === typeFilter)
        : selectedDayData?.records || [];

    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    return (
        <>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="relative h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600" />

                <div className="p-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {isOwnAttendance ? 'Mi Historial' : 'Todos los Registros'}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Selecciona un día para ver los detalles
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {!isOwnAttendance && (
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
                            )}

                            <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>

                            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 min-w-[140px] justify-center">
                                <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                                </span>
                            </div>

                            <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Botones de acción (solo admin no propio) */}
                    {!isOwnAttendance && (
                        <div className="flex gap-3 mb-6">
                            <Button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                                <Plus className="w-4 h-4 mr-2" />Crear Registro Manual
                            </Button>
                            <Button variant="outline" onClick={handleExportCSV}>
                                <Download className="w-4 h-4 mr-2" />Exportar CSV
                            </Button>
                        </div>
                    )}

                    {loading ? (
                        <div className="animate-pulse">
                            <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                        </div>
                    ) : (
                        <div>
                            {/* Días de la semana */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {weekDays.map(day => (
                                    <div key={day} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Grid del calendario */}
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((date, idx) => {
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    const isSelected = selectedDay === dateStr;
                                    const isCurrentMonth = isSameMonth(date, currentDate);
                                    const isTodayDate = isToday(date);
                                    const dayData = recordsMap.get(dateStr);

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                if (isCurrentMonth) {
                                                    setSelectedDay(isSelected ? null : dateStr);
                                                }
                                            }}
                                            className={`
                                                calendar-day relative min-h-[80px] p-2 rounded-lg transition-all duration-200
                                                ${getDayStatusColor(date)}
                                                ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400 scale-105 z-10 shadow-lg' : ''}
                                                ${isTodayDate ? 'font-bold' : ''}
                                                ${!isCurrentMonth ? 'cursor-default' : 'cursor-pointer hover:scale-105 hover:shadow-md'}
                                            `}
                                        >
                                            <span className={`
                                                text-xs ${isTodayDate ? 'bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center mx-auto' : ''}
                                            `}>
                                                {format(date, 'd')}
                                            </span>
                                            
                                            {getDayIndicator(date)}

                                            {dayData && dayData.hoursWorked !== null && (
                                                <div className="absolute bottom-1 right-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                                    {formatHoursWorked(dayData.hoursWorked)}
                                                </div>
                                            )}

                                            {/* Indicador de múltiples usuarios (solo admin) */}
                                            {!isOwnAttendance && dayData && dayData.records.length > 0 && (
                                                <div className="absolute bottom-1 left-1 text-[10px] text-slate-400">
                                                    {new Set(dayData.records.map(r => r.user_id)).size > 1 && (
                                                        <User className="w-3 h-3" />
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Panel de detalles del día seleccionado */}
                            {selectedDay && selectedDayData && (
                                <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-sm">
                                            {formatDate(selectedDay)}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            {selectedDayData.hoursWorked !== null && (
                                                <Badge variant="outline" className="text-xs">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {formatHoursWorked(selectedDayData.hoursWorked)} hrs
                                                </Badge>
                                            )}
                                            <button
                                                onClick={() => setSelectedDay(null)}
                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>

                                    {filteredDayRecords.length > 0 ? (
                                        <div className="space-y-2">
                                            {filteredDayRecords.map((record) => (
                                                <div key={record.id} className="flex items-center gap-3 text-sm group bg-white dark:bg-slate-800 p-2 rounded-lg">
                                                    {getTypeIcon(record.type, 'sm')}
                                                    <Badge className={`text-xs ${getTypeBadgeColor(record.type)}`}>
                                                        {getTypeLabel(record.type)}
                                                    </Badge>

                                                    {!isOwnAttendance && (
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[100px]">
                                                            <User className="w-3 h-3 inline mr-1" />
                                                            {record.user_name}
                                                        </span>
                                                    )}

                                                    <span className="font-mono text-xs text-slate-700 dark:text-slate-200">
                                                        {formatTime(record.timestamp)}
                                                    </span>

                                                    {record.is_manual && (
                                                        <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">
                                                            Manual
                                                        </Badge>
                                                    )}

                                                    <div className="flex-1">
                                                        <span className="text-xs text-slate-400">
                                                            {record.notes || 'Sin notas'}
                                                        </span>
                                                    </div>

                                                    {record.latitude !== null && record.longitude !== null && (
                                                        <button 
                                                            onClick={() => setViewingLocation({ 
                                                                latitude: record.latitude!, 
                                                                longitude: record.longitude!, 
                                                                userName: record.user_name, 
                                                                timestamp: record.timestamp, 
                                                                type: record.type 
                                                            })}
                                                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-all" 
                                                            title="Ver ubicación"
                                                        >
                                                            <MapPin className="w-3 h-3 text-red-500" />
                                                        </button>
                                                    )}

                                                    <button 
                                                        onClick={() => setEditingRecord(record)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-all" 
                                                        title="Editar registro"
                                                    >
                                                        <Edit3 className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">
                                            {typeFilter !== 'all' 
                                                ? `No hay registros de tipo "${getTypeLabel(typeFilter)}" este día` 
                                                : 'Sin registros este día'
                                            }
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Mensaje cuando no hay datos en el mes */}
                            {records.length === 0 && (
                                <div className="text-center py-8 mt-4">
                                    <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-500 dark:text-slate-400">No hay registros este mes</p>
                                </div>
                            )}

                            {/* Leyenda */}
                            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-950/50 border border-green-300" />
                                    <span className="text-[10px] text-slate-500">Completo</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-950/50 border border-yellow-300" />
                                    <span className="text-[10px] text-slate-500">Incompleto</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-950/50 border border-red-300" />
                                    <span className="text-[10px] text-slate-500">Sin registros</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="flex gap-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    </div>
                                    <span className="text-[10px] text-slate-500">E, SC, RC, S</span>
                                </div>
                                {!isOwnAttendance && (
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-3 h-3 text-slate-400" />
                                        <span className="text-[10px] text-slate-500">Múltiples usuarios</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {editingRecord && (
                <EditAttendanceModal 
                    isOpen={!!editingRecord} 
                    onClose={() => setEditingRecord(null)} 
                    record={editingRecord} 
                    onSave={handleEditSave} 
                />
            )}

            <CreateManualRecord 
                isOpen={showCreateModal} 
                onClose={() => setShowCreateModal(false)} 
                onCreate={handleCreateRecord} 
            />

            {viewingLocation && (
                <LocationViewer 
                    isOpen={!!viewingLocation} 
                    onClose={() => setViewingLocation(null)}
                    latitude={viewingLocation.latitude} 
                    longitude={viewingLocation.longitude}
                    userName={viewingLocation.userName} 
                    timestamp={viewingLocation.timestamp} 
                    type={viewingLocation.type} 
                />
            )}
        </>
    );
}