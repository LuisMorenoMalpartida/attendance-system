'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface ImageUploadProps {
  currentImage?: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
}

export function ImageUpload({ 
  currentImage, 
  onUpload, 
  onDelete,
  size = 'md' 
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Formato no permitido. Usa JPG, PNG o WebP');
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5MB');
      return;
    }

    // Mostrar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Subir
    setLoading(true);
    setError(null);

    try {
      await onUpload(file);
      
      gsap.fromTo('.upload-success',
        { scale: 0 },
        { scale: 1, duration: 0.3, ease: 'back.out(1.7)' }
      );
    } catch (err: any) {
      setError(err.message || 'Error al subir imagen');
      setPreview(currentImage || null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setLoading(true);
    try {
      await onDelete();
      setPreview(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Contenedor de imagen */}
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-4 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800`}>
          {preview ? (
            <img
              src={preview}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-8 h-8 text-slate-400" />
            </div>
          )}
        </div>

        {/* Overlay de carga */}
        {loading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 text-center max-w-[200px]">
          {error}
        </p>
      )}

      {/* Botones */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {preview ? 'Cambiar' : 'Subir Foto'}
        </Button>

        {preview && onDelete && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}