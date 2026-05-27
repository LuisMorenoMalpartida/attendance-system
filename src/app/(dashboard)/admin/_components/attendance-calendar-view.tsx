'use client';

import { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    User,
    Download,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Coffee,
    LogIn,
    LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface CalendarDay {
    date: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isWeekend: boolean;
    isSaturday: boolean;
    records: Array<{
        id: number;
        type: string;
        timestamp: string;
        notes: string | null;
        is_manual: boolean;
    }>;
    hoursWorked: number | null;
    status: 'complete' | 'incomplete' | 'absent' | 'weekend' | 'saturday_complete' | 'saturday_incomplete' | 'saturday_absent';
}

export function AttendanceCalendarView() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
    const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
    const [showDayDetail, setShowDayDetail] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (selectedUser && selectedUser !== '') {
            fetchMonthData();
        }
    }, [currentDate, selectedUser]);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users?active=true');
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
            }
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
        }
    };

    const fetchMonthData = async () => {
        if (!selectedUser || selectedUser === '') return;

        setLoading(true);
        setError(null);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;

            console.log(`🔍 Cargando datos para usuario ${selectedUser} - ${month}/${year}`);

            const response = await fetch(
                `/api/admin/users/${selectedUser}/attendance?year=${year}&month=${month}`
            );

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Error al cargar datos');
            }

            const data = await response.json();
            console.log(`✅ Datos recibidos:`, data);
            
            if (data.records) {
                // Normalizar fechas: convertir "2026-05-27T05:00:00.000Z" a "2026-05-27"
                const normalizedRecords = data.records.map((day: any) => ({
                    ...day,
                    date: day.date ? day.date.split('T')[0] : day.date,
                    records: (day.records || []).map((record: any) => ({
                        ...record,
                    }))
                }));
                console.log(`📅 Registros normalizados:`, normalizedRecords);
                generateCalendarDays(normalizedRecords);
            } else {
                setError('No se encontraron registros');
                setCalendarDays([]);
            }
        } catch (error: any) {
            console.error('❌ Error al cargar datos:', error);
            setError(error.message || 'Error al cargar los datos');
            setCalendarDays([]);
        } finally {
            setLoading(false);
        }
    };

    const generateCalendarDays = (records: any[]) => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const startingDayOfWeek = firstDay.getDay();

        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const days: CalendarDay[] = [];

        // Días del mes anterior
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push(createDayObject(date, false, records, todayStr));
        }

        // Días del mes actual
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            days.push(createDayObject(date, true, records, todayStr));
        }

        // Días del mes siguiente
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(year, month + 1, i);
            days.push(createDayObject(date, false, records, todayStr));
        }

        console.log(`📅 Días generados: ${days.length} días`);
        setCalendarDays(days);
    };

    const createDayObject = (date: Date, isCurrentMonth: boolean, records: any[], todayStr: string): CalendarDay => {
        const dateStr = date.toISOString().split('T')[0];
        
        // Buscar registros para esta fecha (ya normalizada)
        const dayData = records.find((r: any) => r.date === dateStr);
        const dayRecords = dayData?.records || [];
        
        const dayOfWeek = date.getDay();
        const isSaturday = dayOfWeek === 6;
        const isSunday = dayOfWeek === 0;
        const isWeekend = isSunday;

        let hoursWorked = dayData?.hoursWorked || null;

        // Si no hay hoursWorked en los datos, calcular manualmente
        if (hoursWorked === null && dayRecords.length > 0) {
            const checkIn = dayRecords.find((r: any) => r.type === 'check_in');
            const checkOut = dayRecords.find((r: any) => r.type === 'check_out');

            if (checkIn && checkOut) {
                const diff = new Date(checkOut.timestamp).getTime() - new Date(checkIn.timestamp).getTime();
                const lunchOut = dayRecords.find((r: any) => r.type === 'lunch_out');
                const lunchIn = dayRecords.find((r: any) => r.type === 'lunch_in');

                let lunchTime = 0;
                if (lunchOut && lunchIn) {
                    lunchTime = new Date(lunchIn.timestamp).getTime() - new Date(lunchOut.timestamp).getTime();
                }

                hoursWorked = (diff - lunchTime) / (1000 * 60 * 60);
            }
        }

        const checkIn = dayRecords.find((r: any) => r.type === 'check_in');
        const checkOut = dayRecords.find((r: any) => r.type === 'check_out');

        let status: CalendarDay['status'] = 'absent';
        if (isSunday) {
            status = 'weekend';
        } else if (isSaturday) {
            if (checkIn && checkOut) {
                status = 'saturday_complete';
            } else if (checkIn) {
                status = 'saturday_incomplete';
            } else {
                status = 'saturday_absent';
            }
        } else {
            if (checkIn && checkOut) {
                status = 'complete';
            } else if (checkIn) {
                status = 'incomplete';
            }
        }

        return {
            date: dateStr,
            dayNumber: date.getDate(),
            isCurrentMonth,
            isToday: dateStr === todayStr,
            isWeekend: isSunday,
            isSaturday,
            records: dayRecords,
            hoursWorked,
            status,
        };
    };

    const changeMonth = (increment: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + increment);
        setCurrentDate(newDate);
    };

    const getStatusColor = (status: CalendarDay['status']) => {
        switch (status) {
            case 'complete': return 'bg-green-100 dark:bg-green-950/50 border-green-300 dark:border-green-700';
            case 'incomplete': return 'bg-yellow-100 dark:bg-yellow-950/50 border-yellow-300 dark:border-yellow-700';
            case 'absent': return 'bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-700';
            case 'weekend': return 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700';
            case 'saturday_complete': return 'bg-blue-100 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700';
            case 'saturday_incomplete': return 'bg-amber-100 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700';
            case 'saturday_absent': return 'bg-orange-100 dark:bg-orange-950/50 border-orange-300 dark:border-orange-700';
        }
    };

    const getStatusIcon = (status: CalendarDay['status']) => {
        switch (status) {
            case 'complete':
            case 'saturday_complete': return <CheckCircle2 className="w-3 h-3 text-green-600" />;
            case 'incomplete':
            case 'saturday_incomplete': return <AlertCircle className="w-3 h-3 text-yellow-600" />;
            case 'absent':
            case 'saturday_absent': return <XCircle className="w-3 h-3 text-red-600" />;
            case 'weekend': return null;
        }
    };

    const exportMonthData = () => {
        const monthData = calendarDays
            .filter(day => day.isCurrentMonth && !day.isWeekend)
            .map(day => ({
                Fecha: new Date(day.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' }),
                Tipo: day.isSaturday ? 'Sábado' : 'Regular',
                Estado: day.status.includes('complete') ? 'Completo' : day.status.includes('incomplete') ? 'Incompleto' : 'Ausente',
                Entrada: day.records.find(r => r.type === 'check_in')?.timestamp
                    ? new Date(day.records.find(r => r.type === 'check_in')!.timestamp).toLocaleTimeString('es-ES')
                    : '--:--',
                Salida: day.records.find(r => r.type === 'check_out')?.timestamp
                    ? new Date(day.records.find(r => r.type === 'check_out')!.timestamp).toLocaleTimeString('es-ES')
                    : '--:--',
                'Horas Trabajadas': day.hoursWorked ? day.hoursWorked.toFixed(2) : '0.00',
            }));

        if (monthData.length === 0) return;

        const csv = [
            Object.keys(monthData[0]).join(','),
            ...monthData.map(row => Object.values(row).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const userName = users.find(u => u.id.toString() === selectedUser)?.name || 'usuario';
        a.download = `asistencia_${userName}_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}.csv`;
        a.click();
    };

    const formatHours = (hours: number | null): string => {
        if (hours === null) return '--:--';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'check_in': return <LogIn className="w-3 h-3 text-blue-500" />;
            case 'lunch_out': return <Coffee className="w-3 h-3 text-orange-500" />;
            case 'lunch_in': return <Coffee className="w-3 h-3 text-green-500" />;
            case 'check_out': return <LogOut className="w-3 h-3 text-red-500" />;
            default: return <Clock className="w-3 h-3" />;
        }
    };

    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-slate-600" />
                        <Select
                            value={selectedUser}
                            onValueChange={(value) => {
                                console.log('👤 Usuario seleccionado:', value);
                                setSelectedUser(value ?? '');
                            }}
                        >
                            <SelectTrigger className="w-56">
                                <SelectValue placeholder="Seleccionar usuario" />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedUser && (
                        <Button onClick={exportMonthData} variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Exportar Mes
                        </Button>
                    )}
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {selectedUser && (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={() => changeMonth(-1)}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </h3>

                            <button
                                onClick={() => changeMonth(1)}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {weekDays.map(day => (
                                <div key={day} className={`text-center text-xs font-semibold py-2 ${
                                    day === 'Sáb' ? 'text-blue-500 dark:text-blue-400' :
                                    day === 'Dom' ? 'text-red-500 dark:text-red-400' :
                                    'text-slate-500 dark:text-slate-400'
                                }`}>
                                    {day}
                                </div>
                            ))}
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-7 gap-1">
                                {[...Array(42)].map((_, i) => (
                                    <div key={i} className="aspect-square animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg" />
                                ))}
                            </div>
                        ) : calendarDays.length === 0 && !loading ? (
                            <div className="text-center py-8">
                                <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">No se pudieron generar los días del calendario</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((day, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            if (day.isCurrentMonth && !day.isWeekend) {
                                                setSelectedDay(day);
                                                setShowDayDetail(true);
                                            }
                                        }}
                                        className={`
                                            aspect-square p-2 rounded-lg border text-left transition-all hover:scale-105
                                            ${!day.isCurrentMonth ? 'opacity-30' : ''}
                                            ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                                            ${getStatusColor(day.status)}
                                            ${day.isCurrentMonth && !day.isWeekend ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'}
                                        `}
                                    >
                                        <div className="flex flex-col h-full">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs font-semibold ${
                                                    day.isCurrentMonth ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                                                }`}>
                                                    {day.dayNumber}
                                                </span>
                                                {getStatusIcon(day.status)}
                                            </div>

                                            {day.isSaturday && day.isCurrentMonth && (
                                                <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5">
                                                    9AM-12PM
                                                </p>
                                            )}

                                            {day.isCurrentMonth && day.hoursWorked !== null && (
                                                <div className="mt-auto">
                                                    <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                                                        {formatHours(day.hoursWorked)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-950/50 border border-green-300" />
                                <span className="text-xs text-slate-600 dark:text-slate-400">Completo</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-950/50 border border-yellow-300" />
                                <span className="text-xs text-slate-600 dark:text-slate-400">Incompleto</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-950/50 border border-red-300" />
                                <span className="text-xs text-slate-600 dark:text-slate-400">Ausente</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-950/50 border border-blue-300" />
                                <span className="text-xs text-slate-600 dark:text-slate-400">Sábado</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800/50 border border-gray-300" />
                                <span className="text-xs text-slate-600 dark:text-slate-400">Domingo</span>
                            </div>
                        </div>
                    </>
                )}

                {!selectedUser && (
                    <div className="text-center py-12">
                        <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">
                            Selecciona un usuario para ver su calendario de asistencia
                        </p>
                    </div>
                )}
            </div>

            {/* Modal de detalle del día */}
            {showDayDetail && selectedDay && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDayDetail(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('es-ES', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                })}
                            </h3>
                            <button
                                onClick={() => setShowDayDetail(false)}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                ✕
                            </button>
                        </div>

                        {selectedDay.isSaturday && (
                            <div className="mb-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-xs text-blue-700 dark:text-blue-400">
                                🕐 Sábado - Horario: 09:00 - 12:00
                            </div>
                        )}

                        {selectedDay.records.length > 0 ? (
                            <div className="space-y-3">
                                {selectedDay.records.map(record => (
                                    <div key={record.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                        {getTypeIcon(record.type)}
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {record.type === 'check_in' ? 'Entrada' :
                                                 record.type === 'lunch_out' ? 'Salida comida' :
                                                 record.type === 'lunch_in' ? 'Regreso comida' : 'Salida'}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(record.timestamp).toLocaleTimeString('es-ES')}
                                            </p>
                                        </div>
                                        {record.is_manual && (
                                            <Badge variant="outline" className="text-xs">Manual</Badge>
                                        )}
                                    </div>
                                ))}

                                {selectedDay.hoursWorked && (
                                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Horas trabajadas: <span className="font-bold text-slate-900 dark:text-white">
                                                {formatHours(selectedDay.hoursWorked)}
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 py-4">Sin registros este día</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}