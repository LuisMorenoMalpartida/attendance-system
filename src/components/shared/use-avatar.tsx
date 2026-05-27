'use client';

import { useState } from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src: string | null;
  alt: string;
  size?: number;
  className?: string;
}

export function UserAvatar({ src, alt, size = 40, className = '' }: UserAvatarProps) {
  const [error, setError] = useState(false);

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
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="object-cover"
        onError={() => setError(true)}
        unoptimized // Para URLs externas de Vercel Blob
      />
    </div>
  );
}