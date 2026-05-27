'use client';

import { useState } from 'react';

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadProfilePhoto = async (file: File): Promise<string> => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('profilePhoto', file);

      const response = await fetch('/api/users/profile-photo', {
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

  const deleteProfilePhoto = async (): Promise<void> => {
    setUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/profile-photo', {
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