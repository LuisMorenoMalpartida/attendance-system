'use client';

import { UserHeader } from './_components/user-header';
import { AttendanceCard } from './_components/attendance-card';
import { AttendanceStats } from './_components/attendance-stats';
import { AttendanceHistory } from './_components/attendance-history';

export default function UserDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <UserHeader />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal - Registro de asistencia */}
          <div className="lg:col-span-2 space-y-6">
            <AttendanceCard />
            <AttendanceHistory />
          </div>
          
          {/* Sidebar - Estadísticas */}
          <div className="space-y-6">
            <AttendanceStats />
          </div>
        </div>
      </main>
    </div>
  );
}