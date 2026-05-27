'use client';

import { useState } from 'react';
import { AdminHeader } from './_components/admin-header';
import { AdminAttendanceCard } from './_components/admin-attendance-card';
import { AdminStats } from './_components/admin-stats';
import { UsersManagement } from './_components/users-management';
import { AttendanceCalendarView } from './_components/attendance-calendar-view';
import { AdminAttendanceHistory } from './_components/admin-attendance-history';
import { CorrectionRequestsManager } from './_components/correction-requests-manager';
import { Tabs } from '@/components/ui/tabs';
import { 
  Clock, 
  Users, 
  CalendarDays,
  Settings,
  Send
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('my-attendance');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminHeader />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Tabs de navegación */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <Tabs.List className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <Tabs.Tab 
              value="my-attendance"
              className="flex items-center justify-center gap-2 data-[active=true]:bg-gradient-to-r data-[active=true]:from-blue-600 data-[active=true]:to-purple-600 data-[active=true]:text-white rounded-lg py-2.5"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Mi Asistencia</span>
            </Tabs.Tab>
            
            <Tabs.Tab 
              value="calendar"
              className="flex items-center justify-center gap-2 data-[active=true]:bg-gradient-to-r data-[active=true]:from-cyan-600 data-[active=true]:to-blue-600 data-[active=true]:text-white rounded-lg py-2.5"
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Calendario</span>
            </Tabs.Tab>
            
            <Tabs.Tab 
              value="users"
              className="flex items-center justify-center gap-2 data-[active=true]:bg-gradient-to-r data-[active=true]:from-emerald-600 data-[active=true]:to-teal-600 data-[active=true]:text-white rounded-lg py-2.5"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Usuarios</span>
            </Tabs.Tab>

            <Tabs.Tab 
              value="corrections"
              className="flex items-center justify-center gap-2 data-[active=true]:bg-gradient-to-r data-[active=true]:from-amber-600 data-[active=true]:to-orange-600 data-[active=true]:text-white rounded-lg py-2.5"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Correcciones</span>
            </Tabs.Tab>
            
            <Tabs.Tab 
              value="settings"
              className="flex items-center justify-center gap-2 data-[active=true]:bg-gradient-to-r data-[active=true]:from-orange-600 data-[active=true]:to-red-600 data-[active=true]:text-white rounded-lg py-2.5"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Ajustes</span>
            </Tabs.Tab>
          </Tabs.List>

          {/* Mi Asistencia (Admin) */}
          <Tabs.Panel value="my-attendance" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <AdminAttendanceCard />
                <AdminAttendanceHistory isOwnAttendance={true} />
              </div>
              <div className="space-y-6">
                <AdminStats isOwnStats={true} />
              </div>
            </div>
          </Tabs.Panel>

          {/* Calendario de Asistencia */}
          <Tabs.Panel value="calendar" className="mt-6">
            <AttendanceCalendarView />
          </Tabs.Panel>

          {/* Gestión de Usuarios */}
          <Tabs.Panel value="users" className="mt-6">
            <UsersManagement />
          </Tabs.Panel>

          {/* Solicitudes de Corrección */}
          <Tabs.Panel value="corrections" className="mt-6">
            <CorrectionRequestsManager />
          </Tabs.Panel>

          {/* Configuración */}
          <Tabs.Panel value="settings" className="mt-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Configuración del Sistema
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Próximamente: configuración de horarios, empresas, y más...
              </p>
            </div>
          </Tabs.Panel>
        </Tabs>
      </main>
    </div>
  );
}