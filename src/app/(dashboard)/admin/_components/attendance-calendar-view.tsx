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
    FileSpreadsheet,
    Users,
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
import ExcelJS from 'exceljs';

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
        user_name?: string;
        user_id?: number;
    }>;
    hoursWorked: number | null;
    status: 'complete' | 'incomplete' | 'absent' | 'weekend' | 'saturday_complete' | 'saturday_incomplete' | 'saturday_absent';
    usersStatus?: Array<{
        user_id: number;
        user_name: string;
        status: string;
        color: { bg: string; border: string; text: string; light: string };
    }>;
}

const USER_COLORS = [
    { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-700', light: 'bg-blue-50' },
    { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-700', light: 'bg-green-50' },
    { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-700', light: 'bg-purple-50' },
    { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-700', light: 'bg-orange-50' },
    { bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-700', light: 'bg-pink-50' },
    { bg: 'bg-teal-500', border: 'border-teal-500', text: 'text-teal-700', light: 'bg-teal-50' },
    { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-700', light: 'bg-amber-50' },
    { bg: 'bg-indigo-500', border: 'border-indigo-500', text: 'text-indigo-700', light: 'bg-indigo-50' },
    { bg: 'bg-rose-500', border: 'border-rose-500', text: 'text-rose-700', light: 'bg-rose-50' },
    { bg: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-cyan-700', light: 'bg-cyan-50' },
];

export function AttendanceCalendarView() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
    const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
    const [showDayDetail, setShowDayDetail] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

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

            if (selectedUser === 'all') {
                // Cargar datos de todos los usuarios
                const allRecords: any[] = [];
                for (const user of users) {
                    const response = await fetch(
                        `/api/admin/users/${user.id}/attendance?year=${year}&month=${month}`
                    );
                    if (response.ok) {
                        const data = await response.json();
                        const userRecords = (data.records || []).map((day: any) => ({
                            ...day,
                            date: day.date ? day.date.split('T')[0] : day.date,
                            records: (day.records || []).map((record: any) => ({
                                ...record,
                                user_name: user.name,
                                user_id: user.id,
                            }))
                        }));
                        allRecords.push(...userRecords);
                    }
                }
                generateCalendarDaysForAll(allRecords);
            } else {
                // Cargar datos de un solo usuario
                const response = await fetch(
                    `/api/admin/users/${selectedUser}/attendance?year=${year}&month=${month}`
                );
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Error al cargar datos');
                }
                const data = await response.json();
                if (data.records) {
                    const normalizedRecords = data.records.map((day: any) => ({
                        ...day,
                        date: day.date ? day.date.split('T')[0] : day.date,
                        records: (day.records || []).map((record: any) => ({
                            ...record,
                        }))
                    }));
                    generateCalendarDays(normalizedRecords);
                } else {
                    setCalendarDays([]);
                }
            }
        } catch (error: any) {
            console.error('Error al cargar datos:', error);
            setError(error.message || 'Error al cargar los datos');
            setCalendarDays([]);
        } finally {
            setLoading(false);
        }
    };

    const generateCalendarDaysForAll = (allRecords: any[]) => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const startingDayOfWeek = firstDay.getDay();
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const days: CalendarDay[] = [];

        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push(createDayObjectForAll(date, false, allRecords, todayStr));
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            days.push(createDayObjectForAll(date, true, allRecords, todayStr));
        }
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(year, month + 1, i);
            days.push(createDayObjectForAll(date, false, allRecords, todayStr));
        }

        setCalendarDays(days);
    };

    const createDayObjectForAll = (date: Date, isCurrentMonth: boolean, allRecords: any[], todayStr: string): CalendarDay => {
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();
        const isSaturday = dayOfWeek === 6;
        const isSunday = dayOfWeek === 0;

        const usersStatus = users.map((user, index) => {
            const userDayData = allRecords.find((r: any) => 
                r.date === dateStr && r.records?.some((rec: any) => rec.user_id === user.id)
            );
            const userRecords = userDayData?.records?.filter((r: any) => r.user_id === user.id) || [];
            
            const hasCheckIn = userRecords.some((r: any) => r.type === 'check_in');
            const hasCheckOut = userRecords.some((r: any) => r.type === 'check_out');
            
            let status = 'absent';
            if (isSunday) status = 'weekend';
            else if (hasCheckIn && hasCheckOut) status = 'complete';
            else if (hasCheckIn) status = 'incomplete';

            return {
                user_id: user.id,
                user_name: user.name,
                status,
                color: USER_COLORS[index % USER_COLORS.length],
            };
        });

        const allComplete = usersStatus.every(u => u.status === 'complete' || u.status === 'weekend');
        const allAbsent = usersStatus.every(u => u.status === 'absent' || u.status === 'weekend');
        
        let status: CalendarDay['status'] = 'absent';
        if (isSunday) status = 'weekend';
        else if (allComplete) status = 'complete';
        else if (allAbsent) status = 'absent';
        else status = 'incomplete';

        return {
            date: dateStr,
            dayNumber: date.getDate(),
            isCurrentMonth,
            isToday: dateStr === todayStr,
            isWeekend: isSunday,
            isSaturday,
            records: [],
            hoursWorked: null,
            status,
            usersStatus,
        };
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

        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push(createDayObject(date, false, records, todayStr));
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            days.push(createDayObject(date, true, records, todayStr));
        }
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(year, month + 1, i);
            days.push(createDayObject(date, false, records, todayStr));
        }

        setCalendarDays(days);
    };

    const createDayObject = (date: Date, isCurrentMonth: boolean, records: any[], todayStr: string): CalendarDay => {
        const dateStr = date.toISOString().split('T')[0];
        const dayData = records.find((r: any) => r.date === dateStr);
        const dayRecords = dayData?.records || [];
        const dayOfWeek = date.getDay();
        const isSaturday = dayOfWeek === 6;
        const isSunday = dayOfWeek === 0;
        const isWeekend = isSunday;

        let hoursWorked = dayData?.hoursWorked || null;
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
        if (isSunday) status = 'weekend';
        else if (isSaturday) {
            if (checkIn && checkOut) status = 'saturday_complete';
            else if (checkIn) status = 'saturday_incomplete';
            else status = 'saturday_absent';
        } else {
            if (checkIn && checkOut) status = 'complete';
            else if (checkIn) status = 'incomplete';
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

    const getStatusText = (status: CalendarDay['status']): string => {
        switch (status) {
            case 'complete': return 'Completo';
            case 'incomplete': return 'Incompleto';
            case 'absent': return 'Ausente';
            case 'weekend': return 'Domingo';
            case 'saturday_complete': return 'Completo (Sáb)';
            case 'saturday_incomplete': return 'Incompleto (Sáb)';
            case 'saturday_absent': return 'Ausente (Sáb)';
        }
    };

    const formatTime = (timestamp: string | undefined): string => {
        if (!timestamp) return '--:--';
        return new Date(timestamp).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const exportToExcel = async () => {
        const monthData = calendarDays.filter(day => day.isCurrentMonth && !day.isWeekend);
        if (monthData.length === 0) return;

        setExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Sistema de Asistencia';
            workbook.created = new Date();
            const worksheet = workbook.addWorksheet('Asistencia', {
                properties: { tabColor: { argb: '2563EB' } }
            });

            worksheet.columns = [
                { header: 'Fecha', key: 'fecha', width: 20 },
                { header: 'Día', key: 'dia', width: 12 },
                { header: 'Tipo', key: 'tipo', width: 14 },
                { header: 'Estado', key: 'estado', width: 16 },
                { header: 'Entrada', key: 'entrada', width: 12 },
                { header: 'Salida Comida', key: 'salida_comida', width: 14 },
                { header: 'Regreso Comida', key: 'regreso_comida', width: 14 },
                { header: 'Salida', key: 'salida', width: 12 },
                { header: 'Horas Trab.', key: 'horas', width: 14 },
                { header: 'Notas', key: 'notas', width: 30 },
            ];

            const userName = users.find(u => u.id.toString() === selectedUser)?.name || 'Usuario';
            const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

            worksheet.mergeCells('A1:J1');
            const titleCell = worksheet.getCell('A1');
            titleCell.value = `Reporte de Asistencia - ${userName} - ${monthName}`;
            titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E40AF' } };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
            worksheet.getRow(1).height = 30;

            worksheet.mergeCells('A2:J2');
            const totalDays = monthData.length;
            const completeDays = monthData.filter(d => d.status.includes('complete')).length;
            const incompleteDays = monthData.filter(d => d.status.includes('incomplete')).length;
            const absentDays = monthData.filter(d => d.status.includes('absent')).length;
            const totalHours = monthData.reduce((sum, d) => sum + (d.hoursWorked || 0), 0);

            const subtitleCell = worksheet.getCell('A2');
            subtitleCell.value = `Total días: ${totalDays} | Completos: ${completeDays} | Incompletos: ${incompleteDays} | Ausentes: ${absentDays} | Horas totales: ${totalHours.toFixed(1)}h`;
            subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '6B7280' } };
            subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.getRow(2).height = 22;

            const headerRow = worksheet.getRow(4);
            headerRow.values = ['Fecha', 'Día', 'Tipo', 'Estado', 'Entrada', 'Salida Comida', 'Regreso Comida', 'Salida', 'Horas Trab.', 'Notas'];
            headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
            headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            headerRow.height = 25;

            let currentRow = 5;
            let totalHoras = 0;

            monthData.forEach((day) => {
                const fecha = new Date(day.date + 'T12:00:00');
                const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'long' });
                const fechaFormato = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
                const tipo = day.isSaturday ? 'Sábado' : 'Regular';
                const estado = getStatusText(day.status);
                const entrada = formatTime(day.records.find(r => r.type === 'check_in')?.timestamp);
                const salidaComida = formatTime(day.records.find(r => r.type === 'lunch_out')?.timestamp);
                const regresoComida = formatTime(day.records.find(r => r.type === 'lunch_in')?.timestamp);
                const salida = formatTime(day.records.find(r => r.type === 'check_out')?.timestamp);
                const horas = day.hoursWorked || 0;
                totalHoras += horas;
                const notas = day.records.map(r => r.notes).filter(Boolean).join('; ') || '';

                const row = worksheet.getRow(currentRow);
                row.values = [fechaFormato, diaSemana, tipo, estado, entrada, salidaComida, regresoComida, salida, horas.toFixed(2), notas];
                row.font = { name: 'Arial', size: 10 };
                row.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 22;

                let bgColor = 'FFFFFF';
                if (estado.includes('Completo')) bgColor = 'DCFCE7';
                else if (estado.includes('Incompleto')) bgColor = 'FEF9C3';
                else if (estado.includes('Ausente')) bgColor = 'FEE2E2';

                row.eachCell((cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });

                if (day.isSaturday) {
                    row.getCell(3).font = { name: 'Arial', size: 10, bold: true, color: { argb: '2563EB' } };
                }

                currentRow++;
            });

            const totalRow = worksheet.getRow(currentRow);
            worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
            totalRow.getCell(1).value = 'TOTALES';
            totalRow.getCell(1).font = { name: 'Arial', size: 11, bold: true };
            totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
            totalRow.getCell(9).value = totalHoras.toFixed(2);
            totalRow.getCell(9).font = { name: 'Arial', size: 11, bold: true, color: { argb: '2563EB' } };
            totalRow.getCell(9).alignment = { horizontal: 'center' };
            totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
            totalRow.height = 25;
            totalRow.eachCell((cell) => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Asistencia_${userName.replace(/\s+/g, '_')}_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error al exportar:', error);
            alert('Error al exportar el archivo Excel');
        } finally {
            setExporting(false);
        }
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
                            onValueChange={(value) => setSelectedUser(value ?? '')}
                        >
                            <SelectTrigger className="w-64">
                                <SelectValue placeholder="Seleccionar usuario" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <Users className="w-4 h-4" />
                                        Todos los usuarios
                                    </div>
                                </SelectItem>
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedUser && selectedUser !== 'all' && (
                        <Button 
                            onClick={exportToExcel} 
                            variant="default" 
                            size="sm"
                            disabled={exporting}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        >
                            {exporting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Exportando...
                                </>
                            ) : (
                                <>
                                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                                    Exportar Excel
                                </>
                            )}
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
                        ) : calendarDays.length === 0 ? (
                            <div className="text-center py-8">
                                <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">No hay datos para mostrar</p>
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
                                            aspect-square p-2 rounded-lg border text-left transition-all hover:scale-105 relative
                                            ${!day.isCurrentMonth ? 'opacity-30' : ''}
                                            ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                                            ${selectedUser === 'all' ? 'bg-white dark:bg-slate-900' : getStatusColor(day.status)}
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
                                                {selectedUser !== 'all' && getStatusIcon(day.status)}
                                            </div>

                                            {/* Vista "Todos" - bolitas de colores */}
                                            {selectedUser === 'all' && day.usersStatus && (
                                                <div className="flex flex-wrap gap-0.5 mt-1">
                                                    {day.usersStatus.map((us) => (
                                                        <div
                                                            key={us.user_id}
                                                            className={`w-2.5 h-2.5 rounded-full ${us.color.bg}`}
                                                            title={`${us.user_name}: ${us.status === 'complete' ? 'Completo' : us.status === 'incomplete' ? 'Incompleto' : 'Ausente'}`}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {day.isSaturday && day.isCurrentMonth && (
                                                <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5">
                                                    9AM-12PM
                                                </p>
                                            )}

                                            {selectedUser !== 'all' && day.isCurrentMonth && day.hoursWorked !== null && (
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

                        {/* Leyenda para vista "Todos" */}
                        {selectedUser === 'all' && (
                            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                {users.map((user, index) => (
                                    <div key={user.id} className="flex items-center gap-1.5">
                                        <div className={`w-3 h-3 rounded-full ${USER_COLORS[index % USER_COLORS.length].bg}`} />
                                        <span className="text-xs text-slate-600 dark:text-slate-400">{user.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Leyenda normal */}
                        {selectedUser !== 'all' && (
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
                        )}
                    </>
                )}

                {!selectedUser && (
                    <div className="text-center py-12">
                        <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">
                            Selecciona un usuario o &quot;Todos los usuarios&quot; para ver la asistencia
                        </p>
                    </div>
                )}
            </div>

            {/* Modal de detalle del día */}
            {showDayDetail && selectedDay && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDayDetail(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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

                        {/* Vista "Todos" - mostrar estado por usuario */}
                        {selectedUser === 'all' && selectedDay.usersStatus ? (
                            <div className="space-y-2">
                                {selectedDay.usersStatus.map((us) => (
                                    <div key={us.user_id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                        <div className={`w-3 h-3 rounded-full ${us.color.bg}`} />
                                        <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">
                                            {us.user_name}
                                        </span>
                                        <Badge variant={
                                            us.status === 'complete' ? 'default' :
                                            us.status === 'incomplete' ? 'secondary' : 'destructive'
                                        } className="text-xs">
                                            {us.status === 'complete' ? '✅ Completo' :
                                             us.status === 'incomplete' ? '⚠️ Incompleto' : '❌ Ausente'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : selectedDay.records.length > 0 ? (
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