'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';

interface UserAvatarProps {
  userId: number;
  src: string | null;
  alt: string;
  size?: number;
  className?: string;
}

export function UserAvatar({ userId, src, alt, size = 40, className = '' }: UserAvatarProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (src) {
      // Usar la API proxy para obtener la imagen
      setImageSrc(`/api/images/profile/${userId}`);
    }
  }, [src, userId]);

  if (!src || error) {
    return (
      <div 
        className={`rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <User className="text-white" style={{ width: size * 0.5, height: size * 0.5 }} />
      </div>
    );
  }

  return (
    <div 
      className={`relative rounded-full overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={imageSrc || '/default-avatar.png'}
        alt={alt}
        width={size}
        height={size}
        className="object-cover"
        onError={() => setError(true)}
        unoptimized
      />
    </div>
  );
}