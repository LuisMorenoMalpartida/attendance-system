'use client';

import { useState } from 'react';
import { AdminHeader } from './_components/admin-header';
import { AdminAttendanceCard } from './_components/admin-attendance-card';
import { AdminStats } from './_components/admin-stats';
import { UsersManagement } from './_components/users-management';
import { AttendanceCalendarView } from './_components/attendance-calendar-view';
import { AdminAttendanceHistory } from './_components/admin-attendance-history';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  Users, 
  CalendarDays,
  Settings
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('my-attendance');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminHeader />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Tabs de navegación */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <TabsTrigger 
              value="my-attendance"
              className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg py-2.5"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Mi Asistencia</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="calendar"
              className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-lg py-2.5"
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Calendario</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="users"
              className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg py-2.5"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Usuarios</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="settings"
              className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white rounded-lg py-2.5"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Ajustes</span>
            </TabsTrigger>
          </TabsList>

          {/* Mi Asistencia (Admin) */}
          <TabsContent value="my-attendance" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <AdminAttendanceCard />
                <AdminAttendanceHistory isOwnAttendance={true} />
              </div>
              <div className="space-y-6">
                <AdminStats isOwnStats={true} />
              </div>
            </div>
          </TabsContent>

          {/* Calendario de Asistencia */}
          <TabsContent value="calendar" className="mt-6">
            <AttendanceCalendarView />
          </TabsContent>

          {/* Gestión de Usuarios */}
          <TabsContent value="users" className="mt-6">
            <UsersManagement />
          </TabsContent>

          {/* Configuración */}
          <TabsContent value="settings" className="mt-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Configuración del Sistema
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Administra los parámetros globales
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                    Horario Laboral
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    08:00 - 17:45 (Lunes a Viernes)
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Configuración pendiente
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                    Tolerancia
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    15 minutos de tolerancia
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Configuración pendiente
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                    Geolocalización
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Radio de oficina no configurado
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Configuración pendiente
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                    Notificaciones
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Alertas y recordatorios
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Configuración pendiente
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}