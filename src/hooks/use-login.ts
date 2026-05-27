'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LoginState {
  name: string;
  password: string;
}

interface LoginError {
  message: string;
  field?: string;
}

export function useLogin() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginState>({
    name: '',
    password: '',
  });
  const [error, setError] = useState<LoginError | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (field: keyof LoginState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error?.field === field) {
      setError(null);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError({ message: 'El nombre de usuario es requerido', field: 'name' });
      return false;
    }
    if (!formData.password.trim()) {
      setError({ message: 'La contraseña es requerida', field: 'password' });
      return false;
    }
    if (formData.password.length < 3) {
      setError({ message: 'La contraseña debe tener al menos 3 caracteres', field: 'password' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // Pequeña pausa para la animación
      await new Promise(resolve => setTimeout(resolve, 300));
      
      router.push(data.role === 'admin' ? '/admin' : '/user');
    } catch (err: any) {
      setError({ 
        message: err.message || 'Error de conexión. Intenta de nuevo.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    error,
    loading,
    showPassword,
    updateField,
    togglePasswordVisibility,
    handleSubmit,
  };
}