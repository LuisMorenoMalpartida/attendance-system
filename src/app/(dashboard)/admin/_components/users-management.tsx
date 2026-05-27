'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  UserPlus,
  User,
  Shield,
  MoreVertical,
  Edit3,
  UserX,
  UserCheck,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  company_name: string;
  profile_photo: string | null;
  last_attendance: string | null;
}

export function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  useGSAP(() => {
    gsap.fromTo('.user-row',
      { opacity: 0, x: -10 },
      { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
    );
  }, [users]);

  const handleToggleRole = async (userId: number, newRole: string) => {
    try {
      await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      fetchUsers();
    } catch (error) {
      console.error('Error al cambiar rol:', error);
    }
  };

  const handleToggleStatus = async (userId: number, isActive: boolean) => {
    try {
      await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });
      fetchUsers();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="relative h-1 bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600" />

      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Gestión de Usuarios
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Administra los usuarios del sistema
            </p>
          </div>

          <Button className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={roleFilter}
            onValueChange={(value) => {
              if (!value) return;
              setRoleFilter(value);
            }}
          >
            <SelectTrigger className="w-35">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">Usuario</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              if (!value) return;
              setStatusFilter(value);
            }}
          >
            <SelectTrigger className="w-35">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de usuarios */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="user-row flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-slate-400 to-slate-600 flex items-center justify-center shrink-0">
                    {user.profile_photo ? (
                      <img src={user.profile_photo} alt={user.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {user.name}
                      </p>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                        {user.role === 'admin' ? (
                          <Shield className="w-3 h-3 mr-1" />
                        ) : (
                          <User className="w-3 h-3 mr-1" />
                        )}
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Estado */}
                  <Badge variant={user.is_active ? 'outline' : 'destructive'} className="hidden sm:flex">
                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>

                  {/* Última asistencia */}
                  {user.last_attendance && (
                    <div className="hidden lg:flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(user.last_attendance).toLocaleDateString('es-ES')}
                    </div>
                  )}

                  {/* Acciones */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggleRole(user.id, user.role === 'admin' ? 'user' : 'admin')}>
                        <Shield className="w-4 h-4 mr-2" />
                        {user.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Editar usuario
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(user.id, user.is_active)}>
                        {user.is_active ? (
                          <>
                            <UserX className="w-4 h-4 mr-2 text-red-500" />
                            <span className="text-red-600">Desactivar</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-2 text-green-500" />
                            <span className="text-green-600">Activar</span>
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              No se encontraron usuarios
            </p>
          </div>
        )}
      </div>
    </div>
  );
}