'use client';

import { useLogin } from '@/hooks/use-login';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Link from 'next/link';
import {
  LogIn,
  User,
  Lock,
  Eye,
  EyeOff,
  Clock,
  Building2,
  ArrowRight,
  Shield,
  UserPlus,
  Mail
} from 'lucide-react';

export function LoginForm() {
  const {
    formData,
    error,
    loading,
    showPassword,
    updateField,
    togglePasswordVisibility,
    handleSubmit,
  } = useLogin();

  useGSAP(() => {
    // Animación principal del contenedor
    const tl = gsap.timeline();

    tl.fromTo('.login-wrapper',
      {
        opacity: 0,
        scale: 0.9,
        y: 30
      },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out'
      }
    );

    // Animación del header
    tl.fromTo('.login-header-icon',
      {
        scale: 0,
        rotation: -180
      },
      {
        scale: 1,
        rotation: 0,
        duration: 0.6,
        ease: 'back.out(1.7)'
      },
      '-=0.4'
    );

    // Animación del título y descripción
    tl.fromTo('.login-title',
      {
        opacity: 0,
        y: -20
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out'
      },
      '-=0.2'
    );

    tl.fromTo('.login-description',
      {
        opacity: 0,
        y: -10
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out'
      },
      '-=0.3'
    );

    // Animación de los campos del formulario
    tl.fromTo('.form-field',
      {
        opacity: 0,
        x: -30
      },
      {
        opacity: 1,
        x: 0,
        duration: 0.5,
        stagger: 0.15,
        ease: 'power2.out'
      },
      '-=0.2'
    );

    // Animación del botón
    tl.fromTo('.login-button',
      {
        opacity: 0,
        y: 20
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out'
      },
      '-=0.1'
    );

    // Animación del footer con credenciales
    tl.fromTo('.login-footer',
      {
        opacity: 0,
        y: 20
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out'
      },
      '-=0.2'
    );
  }, []);

  // Animación de error
  useGSAP(() => {
    if (error) {
      gsap.fromTo('.error-container',
        {
          x: -20,
          opacity: 0,
          height: 0
        },
        {
          x: 0,
          opacity: 1,
          height: 'auto',
          duration: 0.3,
          ease: 'power2.out'
        }
      );
    }
  }, [error]);

  // Animación de carga del botón
  useGSAP(() => {
    if (loading) {
      gsap.to('.login-button-content', {
        scale: 0.98,
        duration: 0.2,
        ease: 'power2.inOut'
      });
    }
  }, [loading]);

  return (
    <div className="w-full max-w-md">
      <div className="login-wrapper bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

        {/* Header decorativo */}
        <div className="relative h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />

        <div className="p-8">
          {/* Header del formulario */}
          <div className="text-center mb-8">
            <div className="login-header-icon inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 mb-6 shadow-lg">
              <div className="relative">
                <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-slate-900" />
              </div>
            </div>

            <h1 className="login-title text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Iniciar Sesión
            </h1>
            <p className="login-description text-sm text-slate-500 dark:text-slate-400">
              Sistema de Registro de Asistencia
            </p>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="error-container mb-6">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mt-0.5">
                  <span className="text-red-600 dark:text-red-400 text-xs font-bold">!</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error de autenticación
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    {error.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo de email */}
            <div className="form-field space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Correo Electrónico
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className={`h-5 w-5 transition-colors duration-200 ${error?.field === 'email'
                      ? 'text-red-400'
                      : 'text-slate-400 group-focus-within:text-blue-500'
                    }`} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="Ingresa tu correo electronico"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 transition-all duration-200 outline-none ${error?.field === 'email'
                      ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900'
                      : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900'
                    }`}
                  autoComplete="email"
                />
              </div>
              {error?.field === 'email' && (
                <p className="text-xs text-red-500 mt-1 ml-1">{error.message}</p>
              )}
            </div>

            {/* Campo de contraseña */}
            <div className="form-field space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Contraseña
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-5 w-5 transition-colors duration-200 ${error?.field === 'password'
                      ? 'text-red-400'
                      : 'text-slate-400 group-focus-within:text-blue-500'
                    }`} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className={`w-full pl-10 pr-12 py-3 rounded-xl border-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 transition-all duration-200 outline-none ${error?.field === 'password'
                      ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900'
                      : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900'
                    }`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {error?.field === 'password' && (
                <p className="text-xs text-red-500 mt-1 ml-1">{error.message}</p>
              )}
            </div>

            {/* Enlace para recuperar contraseña */}
            <div className="flex justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Botón de submit */}
            <button
              type="submit"
              disabled={loading}
              className="login-button w-full relative group"
            >
              <div className={`login-button-content relative w-full py-3 px-4 rounded-xl font-medium text-white transition-all duration-300 ${loading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98]'
                }`}>
                <div className="flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Iniciando sesión...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Iniciar Sesión</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </div>
              </div>
            </button>
          </form>

          {/* Enlace para registrarse */}
          <div className="mt-6 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-4 text-slate-500 dark:text-slate-400 font-medium">
                  ¿Nuevo en el sistema?
                </span>
              </div>
            </div>

            <Link
              href="/register"
              className="register-link inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-medium border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 group"
            >
              <UserPlus className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span>Crear una cuenta</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}