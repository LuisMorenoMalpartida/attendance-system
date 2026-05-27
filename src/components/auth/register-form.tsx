'use client';

import { useRegister } from '@/hooks/use-register';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Link from 'next/link';
import { 
  UserPlus, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Building2,
  ArrowRight,
  ArrowLeft,
  Camera,
  Check,
  Upload,
  X,
} from 'lucide-react';

export function RegisterForm() {
  const {
    step,
    formData,
    error,
    loading,
    showPassword,
    showConfirmPassword,
    updateField,
    setShowPassword,
    setShowConfirmPassword,
    handlePhotoChange,
    nextStep,
    prevStep,
    handleSubmit,
  } = useRegister();

  useGSAP(() => {
    const tl = gsap.timeline();

    tl.fromTo('.register-wrapper',
      { opacity: 0, scale: 0.9, y: 30 },
      { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    );

    tl.fromTo('.register-header-icon',
      { scale: 0, rotation: -180 },
      { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.7)' },
      '-=0.4'
    );

    tl.fromTo('.register-title',
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      '-=0.2'
    );
  }, []);

  useGSAP(() => {
    gsap.fromTo('.step-content',
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
    );
  }, [step]);

  useGSAP(() => {
    if (error) {
      gsap.fromTo('.error-container',
        { x: -20, opacity: 0, height: 0 },
        { x: 0, opacity: 1, height: 'auto', duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [error]);

  const steps = [
    { number: 1, label: 'Información Personal' },
    { number: 2, label: 'Seguridad' },
    { number: 3, label: 'Foto de Perfil' },
  ];

  return (
    <div className="w-full max-w-2xl">
      <div className="register-wrapper bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        <div className="relative h-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600" />
        
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="register-header-icon inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 mb-6 shadow-lg">
              <UserPlus className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            
            <h1 className="register-title text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Crear Cuenta
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Completa el formulario para registrarte en el sistema
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((s, index) => (
                <div key={s.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      step > s.number 
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : step === s.number
                        ? 'border-emerald-500 text-emerald-500'
                        : 'border-slate-300 dark:border-slate-600 text-slate-400'
                    }`}>
                      {step > s.number ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-semibold">{s.number}</span>
                      )}
                    </div>
                    <span className="text-xs mt-2 font-medium text-slate-600 dark:text-slate-400">
                      {s.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-0.5 mx-4 bg-slate-200 dark:bg-slate-700">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: step > s.number ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-container mb-6">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mt-0.5">
                  <span className="text-red-600 dark:text-red-400 text-xs font-bold">!</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error de registro
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    {error.error}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Personal Information */}
            {step === 1 && (
              <div className="step-content space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 transition-all duration-200 outline-none ${
                        error?.field === 'name'
                          ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900'
                          : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900'
                      }`}
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="Ej: juan@empresa.com"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 transition-all duration-200 outline-none ${
                        error?.field === 'email'
                          ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900'
                          : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900'
                      }`}
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Empresa
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => updateField('companyName', e.target.value)}
                      placeholder="Nombre de tu empresa"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 transition-all duration-200 outline-none ${
                        error?.field === 'companyName'
                          ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900'
                          : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900'
                      }`}
                    />
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  </div>
                </div>

                {/* Información del rol por defecto */}
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                      <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                        Te registrarás como Usuario
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        Podrás registrar tu asistencia diaria. Si necesitas acceso de administrador, solicítalo a tu administrador después de registrarte.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all duration-300"
                >
                  <span className="flex items-center justify-center gap-2">
                    Siguiente
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </div>
            )}

            {/* Step 2: Security */}
            {step === 2 && (
              <div className="step-content space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className={`w-full pl-10 pr-12 py-3 rounded-xl border-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 transition-all duration-200 outline-none ${
                        error?.field === 'password'
                          ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900'
                          : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900'
                      }`}
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => updateField('confirmPassword', e.target.value)}
                      placeholder="Repite tu contraseña"
                      className={`w-full pl-10 pr-12 py-3 rounded-xl border-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 transition-all duration-200 outline-none ${
                        error?.field === 'confirmPassword'
                          ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900'
                          : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900'
                      }`}
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                      La contraseña debe contener:
                    </p>
                    <ul className="space-y-1">
                      <li className="flex items-center gap-2 text-xs">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          formData.password.length >= 6 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'
                        }`}>
                          {formData.password.length >= 6 ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        </div>
                        <span className="text-slate-600 dark:text-slate-400">Mínimo 6 caracteres</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          formData.password === formData.confirmPassword && formData.confirmPassword
                            ? 'bg-emerald-100 text-emerald-600' 
                            : 'bg-slate-200 text-slate-400'
                        }`}>
                          {formData.password === formData.confirmPassword && formData.confirmPassword 
                            ? <Check className="w-3 h-3" /> 
                            : <X className="w-3 h-3" />
                          }
                        </div>
                        <span className="text-slate-600 dark:text-slate-400">Las contraseñas coinciden</span>
                      </li>
                    </ul>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex-1 py-3 px-4 rounded-xl font-medium border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Anterior
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all duration-300"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Siguiente
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Profile Photo */}
            {step === 3 && (
              <div className="step-content space-y-5">
                <div className="text-center">
                  <div className="relative inline-block">
                    {formData.photoPreview ? (
                      <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-100 dark:border-emerald-900">
                        <img
                          src={formData.photoPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handlePhotoChange(null)}
                          className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-4 border-dashed border-slate-300 dark:border-slate-600">
                        <Camera className="w-12 h-12 text-slate-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm font-medium">Subir Foto</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handlePhotoChange(file);
                        }}
                      />
                    </label>
                    <p className="text-xs text-slate-400 mt-2">
                      O puedes agregarla después desde tu perfil
                    </p>
                  </div>
                </div>

                {/* Resumen */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    Resumen de registro
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nombre:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{formData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Empresa:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{formData.companyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rol:</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        Usuario
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex-1 py-3 px-4 rounded-xl font-medium border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Anterior
                    </span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creando cuenta...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Crear Cuenta
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ¿Ya tienes una cuenta?{' '}
              <Link 
                href="/login"
                className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
              >
                Iniciar Sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}