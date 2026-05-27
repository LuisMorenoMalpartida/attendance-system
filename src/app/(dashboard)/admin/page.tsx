'use client';

import { useState, useEffect } from 'react';
import { AdminHeader } from './_components/admin-header';
import { AdminAttendanceCard } from './_components/admin-attendance-card';
import { AdminStats } from './_components/admin-stats';
import { UsersManagement } from './_components/users-management';
import { AttendanceCalendarView } from './_components/attendance-calendar-view';
import { AdminAttendanceHistory } from './_components/admin-attendance-history';
import { CorrectionRequestsManager } from './_components/correction-requests-manager';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Users, 
  CalendarDays,
  Settings,
  Send,
  LayoutDashboard,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Shield,
  Home,
  UserCheck,
  FileText,
  Bell,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useRouter } from 'next/navigation';

const menuItems = [
  {
    id: 'my-attendance',
    label: 'Mi Asistencia',
    icon: Home,
    description: 'Registra y consulta tu asistencia',
    color: 'blue',
  },
  {
    id: 'calendar',
    label: 'Calendario',
    icon: CalendarDays,
    description: 'Vista por usuario',
    color: 'cyan',
  },
  {
    id: 'users',
    label: 'Usuarios',
    icon: Users,
    description: 'Gestionar usuarios',
    color: 'emerald',
    badge: null,
  },
  {
    id: 'corrections',
    label: 'Correcciones',
    icon: FileText,
    description: 'Solicitudes pendientes',
    color: 'amber',
    badge: 3,
  },
  {
    id: 'settings',
    label: 'Configuración',
    icon: Settings,
    description: 'Ajustes del sistema',
    color: 'slate',
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState('my-attendance');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Administrador');

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUserName(data.name || 'Administrador');
      }
    } catch (error) {
      console.error('Error al obtener info:', error);
    }
  };

  useGSAP(() => {
    gsap.fromTo('.menu-item',
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
    );
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; light: string }> = {
      blue: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50 dark:bg-blue-950' },
      cyan: { bg: 'bg-cyan-500', text: 'text-cyan-600', light: 'bg-cyan-50 dark:bg-cyan-950' },
      emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-950' },
      amber: { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50 dark:bg-amber-950' },
      purple: { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50 dark:bg-purple-950' },
      slate: { bg: 'bg-slate-500', text: 'text-slate-600', light: 'bg-slate-50 dark:bg-slate-950' },
    };
    return colors[color] || colors.blue;
  };

  const activeMenuItem = menuItems.find(item => item.id === activeMenu);

  const renderContent = () => {
    switch (activeMenu) {
      case 'my-attendance':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <AdminAttendanceCard />
              <AdminAttendanceHistory isOwnAttendance={true} />
            </div>
            <div className="space-y-6">
              <AdminStats isOwnStats={true} />
            </div>
          </div>
        );
      case 'calendar':
        return <AttendanceCalendarView />;
      case 'users':
        return <UsersManagement />;
      case 'corrections':
        return <CorrectionRequestsManager />;
      case 'reports':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-12 text-center">
            <TrendingUp className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Reportes</h3>
            <p className="text-slate-500 dark:text-slate-400">Próximamente: reportes avanzados y exportación de datos.</p>
          </div>
        );
      case 'settings':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-12 text-center">
            <Settings className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Configuración</h3>
            <p className="text-slate-500 dark:text-slate-400">Próximamente: configuración de horarios, geolocalización y más.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex">
      {/* Overlay para móvil */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen
        bg-white dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-800
        transition-all duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        ${sidebarOpen ? 'lg:w-72' : 'lg:w-20'}
        flex flex-col
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className={`overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
              <h2 className="font-bold text-slate-900 dark:text-white text-lg whitespace-nowrap">
                Asistencia
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Panel Admin</p>
            </div>
          </div>
        </div>

        {/* Menú */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveMenu(item.id);
                setMobileMenuOpen(false);
              }}
              className={`
                menu-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                transition-all duration-200 group relative
                ${activeMenu === item.id 
                  ? `${getColorClasses(item.color).light} ${getColorClasses(item.color).text} font-semibold` 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${activeMenu === item.id ? getColorClasses(item.color).text : ''}`} />
              <div className={`flex-1 text-left overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
                <span className="text-sm whitespace-nowrap">{item.label}</span>
              </div>
              {item.badge && (
                <Badge className="bg-red-500 text-white text-xs h-5 min-w-5 flex items-center justify-center px-1.5">
                  {item.badge}
                </Badge>
              )}
              {activeMenu === item.id && (
                <div className={`absolute right-2 w-1.5 h-6 rounded-full ${getColorClasses(item.color).bg}`} />
              )}
            </button>
          ))}
        </nav>

        {/* Footer del sidebar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={`text-sm overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between px-6 h-16">
            <div className="flex items-center gap-4">
              {/* Botón menú móvil */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Toggle sidebar */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-slate-400">Admin</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-900 dark:text-white">
                  {activeMenuItem?.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {userName}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 p-6">
          {/* Título de sección */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {activeMenuItem?.label}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {activeMenuItem?.description}
            </p>
          </div>

          {renderContent()}
        </main>
      </div>
    </div>
  );
}