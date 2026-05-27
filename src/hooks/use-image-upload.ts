// src/hooks/useImageUpload.ts
'use client';

import { useState } from 'react';

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadProfilePhoto = async (file: File, userId: number): Promise<string> => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('profilePhoto', file);

      // ✅ Usar el endpoint correcto con el userId
      const response = await fetch(`/api/users/${userId}/photo`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al subir foto');
      }

      const data = await response.json();
      return data.profile_photo;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const deleteProfilePhoto = async (userId: number): Promise<void> => {
    setUploading(true);
    setError(null);

    try {
      // ✅ Usar el endpoint correcto con el userId
      const response = await fetch(`/api/users/${userId}/photo`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar foto');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    error,
    uploadProfilePhoto,
    deleteProfilePhoto,
  };
}