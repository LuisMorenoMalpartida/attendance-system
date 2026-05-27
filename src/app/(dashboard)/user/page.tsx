'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UserDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mi Asistencia</h1>
          <p className="text-muted-foreground">Registra tu asistencia diaria</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Registro Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Panel de usuario en construcción...</p>
        </CardContent>
      </Card>
    </div>
  );
}