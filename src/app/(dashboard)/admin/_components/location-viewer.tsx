'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, ExternalLink, X } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface LocationViewerProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  userName: string;
  timestamp: string;
  type: string;
}

export function LocationViewer({ 
  isOpen, 
  onClose, 
  latitude, 
  longitude, 
  userName, 
  timestamp,
  type 
}: LocationViewerProps) {
  useGSAP(() => {
    if (isOpen) {
      gsap.fromTo('.location-content',
        { opacity: 0, scale: 0.9, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isOpen]);

  const getGoogleMapsUrl = () => {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  };

  const getOpenStreetMapUrl = () => {
    return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      check_in: 'Entrada',
      lunch_out: 'Salida comida',
      lunch_in: 'Regreso comida',
      check_out: 'Salida',
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="location-content sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" />
            Ubicación del Registro
          </DialogTitle>
          <DialogDescription>
            {userName} - {getTypeLabel(type)} - {new Date(timestamp).toLocaleString('es-ES')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Mapa embebido (OpenStreetMap) */}
          <div className="relative w-full h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              title="Mapa de ubicación"
            />
          </div>

          {/* Coordenadas */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Coordenadas GPS
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Latitud</p>
                <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                  {latitude.toFixed(6)}
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Longitud</p>
                <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                  {longitude.toFixed(6)}
                </p>
              </div>
            </div>

            {/* Enlaces a mapas externos */}
            <div className="flex gap-2 pt-2">
              <a
                href={getGoogleMapsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Google Maps
                </Button>
              </a>
              
              <a
                href={getOpenStreetMapUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  OpenStreetMap
                </Button>
              </a>
            </div>
          </div>

          {/* Información adicional */}
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900">
            <div className="flex items-start gap-2">
              <Navigation className="w-4 h-4 text-blue-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  Precisión de la ubicación
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  La ubicación se obtiene del dispositivo del usuario al momento del registro.
                  La precisión puede variar según el dispositivo y las condiciones de señal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}