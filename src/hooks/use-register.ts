'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ApiError } from '@/types/api';
import { registerSchema } from '@/lib/validations';
import type { z } from 'zod';

type RegisterFormData = z.infer<typeof registerSchema>;

export function useRegister() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    // El rol siempre será 'user' por defecto
    profilePhoto: null as File | null,
    photoPreview: null as string | null,
  });
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error?.field === field) {
      setError(null);
    }
  };

  const handlePhotoChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField('photoPreview', reader.result as string);
      };
      reader.readAsDataURL(file);
      updateField('profilePhoto', file);
    } else {
      updateField('profilePhoto', null);
      updateField('photoPreview', null);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setError({ error: 'El nombre es requerido', field: 'name' });
        return false;
      }
      if (!formData.email.trim()) {
        setError({ error: 'El email es requerido', field: 'email' });
        return false;
      }
      if (!formData.companyName.trim()) {
        setError({ error: 'El nombre de la empresa es requerido', field: 'companyName' });
        return false;
      }
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError({ error: 'El formato del email no es válido', field: 'email' });
        return false;
      }
    }

    if (currentStep === 2) {
      if (!formData.password) {
        setError({ error: 'La contraseña es requerida', field: 'password' });
        return false;
      }
      if (formData.password.length < 6) {
        setError({ error: 'La contraseña debe tener al menos 6 caracteres', field: 'password' });
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError({ error: 'Las contraseñas no coinciden', field: 'confirmPassword' });
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 3));
      setError(null);
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(2)) return;

    setLoading(true);
    setError(null);

    try {
      // Crear FormData para enviar todo junto (datos + foto)
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('email', formData.email.trim());
      formDataToSend.append('password', formData.password);
      formDataToSend.append('companyName', formData.companyName.trim());
      formDataToSend.append('role', 'user');

      // Si hay foto, agregarla al mismo FormData
      if (formData.profilePhoto) {
        formDataToSend.append('profilePhoto', formData.profilePhoto);
      }

      // Enviar todo como FormData (sin header Content-Type, fetch lo pone automático)
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        body: formDataToSend, // FormData, fetch agrega el Content-Type correcto
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(registerData.error || 'Error al registrar usuario');
      }

      // Animación de éxito
      await new Promise(resolve => setTimeout(resolve, 500));

      router.push('/login?registered=true');
    } catch (err: any) {
      setError({
        error: err.message || 'Error de conexión',
        code: 'REGISTER_ERROR'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
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
  };
}