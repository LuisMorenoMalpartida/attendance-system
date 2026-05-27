'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  LogOut,
  Clock,
  ChevronDown,
  Settings,
  Users,
  Bell,
  X,
  Send,
} from 'lucide-react';
import { UserAvatar } from '@/components/shared/user-avatar';
import gsap from 'gsap';

export function AdminHeader() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>('--:--:--');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userName, setUserName] = useState('Administrador');
  const [userId, setUserId] = useState<number | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    fetchUserInfo();
    fetchPendingCount();

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
        setUserName(data.name || 'Administrador');
        setUserId(data.id || null);
        setAvatarSrc(data.profile_photo || null);
      }
    } catch (error) {
      console.error('Error al obtener info:', error);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const response = await fetch('/api/correction-requests');
      if (response.ok) {
        const data = await response.json();
        const pending = (data.requests || []).filter(
          (r: any) => r.status === 'pending'
        ).length;
        setPendingCount(pending);
      }
    } catch (error) {
      console.error('Error al obtener conteo:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Abrir/cerrar notificaciones
  const toggleNotifications = () => {
    console.log(' Toggle notificaciones. Actual:', showNotifications, '→ Nuevo:', !showNotifications);
    setShowNotifications(!showNotifications);
    if (userMenuOpen) setUserMenuOpen(false);
  };

  // Abrir/cerrar menú usuario
  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
    if (showNotifications) setShowNotifications(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo y título */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-red-600 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  Panel Admin
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-xs font-medium">
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mounted ? currentDate : 'Cargando...'}
              </p>
            </div>
          </div>

          {/* Hora actual */}
          <div className="hidden md:flex items-center gap-2">
            <div className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">
              <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                {currentTime}
              </span>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            {/*  NOTIFICACIONES - Versión simple y directa */}
            <div className="relative">
              <button
                type="button"
                onClick={toggleNotifications}
                className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Notificaciones"
              >
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                {pendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* Panel de notificaciones */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                      Notificaciones
                    </h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Contenido */}
                  <div className="max-h-80 overflow-y-auto">
                    {pendingCount === 0 ? (
                      <div className="text-center py-8 px-4">
                        <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          No hay notificaciones pendientes
                        </p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {/* Solicitudes de corrección */}
                        <div className="p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                Solicitudes de corrección
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {pendingCount} solicitud(es) pendiente(s) de revisión
                              </p>
                              <button
                                onClick={() => {
                                  setShowNotifications(false);
                                  // Buscar el botón de correcciones en el sidebar y hacer clic
                                  const correctionsBtn = document.querySelector('[data-menu="corrections"]');
                                  if (correctionsBtn) {
                                    (correctionsBtn as HTMLButtonElement).click();
                                  }
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2 font-medium"
                              >
                                Revisar ahora →
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        const correctionsBtn = document.querySelector('[data-menu="corrections"]');
                        if (correctionsBtn) {
                          (correctionsBtn as HTMLButtonElement).click();
                        }
                      }}
                      className="w-full text-xs text-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 py-1"
                    >
                      Ver todas las notificaciones
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 👤 Menú de usuario */}
            <div className="relative">
              <button
                type="button"
                onClick={toggleUserMenu}
                className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {userId && avatarSrc ? (
                  <UserAvatar userId={userId} src={avatarSrc} alt={userName} size={32} />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="hidden md:block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {userName}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{userName}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">Administrador</p>
                  </div>

                  <button
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    Gestionar Usuarios
                  </button>

                  <button
                    onClick={() => setUserMenuOpen(false)}
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
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}