'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  LogOut, 
  Clock, 
  Bell, 
  Menu,
  X,
  Settings,
  ChevronDown
} from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export function UserHeader() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>('--:--:--');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [userName, setUserName] = useState('Usuario');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchUserInfo();
    
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        })
      );
      setCurrentDate(
        now.toLocaleDateString('es-ES', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      );
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUserName(data.name || 'Usuario');
      }
    } catch (error) {
      console.error('Error al obtener info del usuario:', error);
    }
  };

  useGSAP(() => {
    if (mounted) {
      gsap.fromTo('.header-element', 
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.1, ease: 'power2.out' }
      );
    }
  }, [mounted]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      
      gsap.to('.header-element', {
        opacity: 0,
        y: -20,
        duration: 0.3,
        stagger: 0.05,
        onComplete: () => {
          router.push('/login');
        }
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo y título */}
          <div className="flex items-center gap-3 header-element">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Mi Asistencia
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mounted ? currentDate : 'Cargando...'}
              </p>
            </div>
          </div>

          {/* Hora actual */}
          <div className="hidden md:flex items-center gap-2 header-element">
            <div className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">
              <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                {currentTime}
              </span>
            </div>
          </div>

          {/* Acciones del usuario */}
          <div className="flex items-center gap-2">
            {/* Notificaciones */}
            <button 
              className="header-element relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setNotifications(0)}
            >
              <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {notifications}
                </span>
              )}
            </button>

            {/* Menú de usuario */}
            <div className="relative header-element">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden md:block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {userName}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-20">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{userName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Usuario</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Configuración
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Menú móvil */}
            <button
              className="header-element md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              ) : (
                <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}