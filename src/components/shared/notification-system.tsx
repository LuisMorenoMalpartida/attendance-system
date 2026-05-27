'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bell,
    X,
    CheckCircle2,
    XCircle,
    Clock,
    Send,
    AlertCircle,
    User,
    FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import gsap from 'gsap';

interface Notification {
    id: number;
    title: string;
    message: string;
    type: 'reminder' | 'alert' | 'info' | 'warning' | 'correction_request';
    is_read: boolean;
    created_at: string;
    reference_type: string | null;
    reference_id: number | null;
    action_url: string | null;
    metadata: any;
}

export function NotificationSystem() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        fetchUserRole();
        fetchNotifications();

        const interval = setInterval(fetchNotifications, 30000); // Cada 30 segundos
        return () => clearInterval(interval);
    }, []);

    const fetchUserRole = async () => {
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                const data = await response.json();
                setUserRole(data.role || '');
            }
        } catch (error) {
            console.error('Error al obtener rol:', error);
        }
    };

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/api/notifications');
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
            }
        } catch (error) {
            console.error('Error al cargar notificaciones:', error);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ));
        } catch (error) {
            console.error('Error al marcar notificación:', error);
        }
    };

    const handleApprove = async (notification: Notification) => {
        if (!notification.reference_id) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/correction-requests/${notification.reference_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' }),
            });

            if (response.ok) {
                await markAsRead(notification.id);
                // Actualizar notificaciones
                fetchNotifications();
            }
        } catch (error) {
            console.error('Error al aprobar:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (notification: Notification) => {
        if (!notification.reference_id) return;

        const reason = prompt('Motivo del rechazo (opcional):');

        setLoading(true);
        try {
            const response = await fetch(`/api/correction-requests/${notification.reference_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'rejected',
                    review_notes: reason || 'Solicitud rechazada'
                }),
            });

            if (response.ok) {
                await markAsRead(notification.id);
                fetchNotifications();
            }
        } catch (error) {
            console.error('Error al rechazar:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleNotifications = () => {
        setShowNotifications(!showNotifications);

        if (!showNotifications) {
            gsap.from('.notification-item', {
                opacity: 0,
                x: 50,
                duration: 0.3,
                stagger: 0.1
            });
        }
    };

    const getNotificationIcon = (type: string, notification: Notification) => {
        // Usar reference_type para identificar solicitudes de corrección
        if (notification.reference_type === 'correction_request') {
            return <Send className="w-5 h-5 text-blue-500" />;
        }

        switch (type) {
            case 'alert': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            case 'reminder': return <Clock className="w-5 h-5 text-purple-500" />;
            default: return <Bell className="w-5 h-5 text-slate-500" />;
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleNotifications}
                className="relative"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                        {unreadCount}
                    </Badge>
                )}
            </Button>

            {showNotifications && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowNotifications(false)}
                    />
                    <Card className="absolute right-0 top-12 w-96 z-50 shadow-2xl border-slate-200 dark:border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">
                                        Notificaciones
                                    </h3>
                                    {unreadCount > 0 && (
                                        <p className="text-xs text-slate-500">
                                            {unreadCount} sin leer
                                        </p>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleNotifications}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {notifications.length === 0 ? (
                                <div className="text-center py-8">
                                    <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-500 dark:text-slate-400">
                                        No hay notificaciones
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {notifications.map(notification => (
                                        <div
                                            key={notification.id}
                                            className={`notification-item p-3 rounded-lg cursor-pointer transition-all ${notification.is_read
                                                    ? 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                    : 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {getNotificationIcon(notification.type, notification)}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant={
                                                            notification.type === 'correction_request' ? 'default' :
                                                                notification.type === 'alert' ? 'destructive' :
                                                                    notification.type === 'warning' ? 'secondary' : 'outline'
                                                        } className="text-xs">
                                                            {notification.type === 'correction_request' ? 'Solicitud' :
                                                                notification.type === 'alert' ? 'Alerta' :
                                                                    notification.type === 'warning' ? 'Aviso' : 'Info'}
                                                        </Badge>
                                                        <span className="text-xs text-slate-400">
                                                            {new Date(notification.created_at).toLocaleDateString('es-ES', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>

                                                    <h4 className="font-medium text-sm text-slate-900 dark:text-white">
                                                        {notification.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                        {notification.message}
                                                    </p>

                                                    {/* Acciones para admin en solicitudes de corrección */}
                                                    {userRole === 'admin' && notification.type === 'correction_request' && (
                                                        <div className="flex gap-2 mt-3">
                                                            <Button
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleApprove(notification);
                                                                }}
                                                                disabled={loading}
                                                                className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                                                            >
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Aprobar
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleReject(notification);
                                                                }}
                                                                disabled={loading}
                                                                className="border-red-300 text-red-600 hover:bg-red-50 h-8 text-xs"
                                                            >
                                                                <XCircle className="w-3 h-3 mr-1" />
                                                                Rechazar
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {/* Estado para usuario normal */}
                                                    {userRole === 'user' && notification.type === 'correction_request' && notification.metadata?.status && (
                                                        <Badge className="mt-2" variant={
                                                            notification.metadata.status === 'approved' ? 'default' :
                                                                notification.metadata.status === 'rejected' ? 'destructive' : 'outline'
                                                        }>
                                                            {notification.metadata.status === 'approved' ? '✅ Aprobada' :
                                                                notification.metadata.status === 'rejected' ? '❌ Rechazada' :
                                                                    '⏳ Pendiente'}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {!notification.is_read && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markAsRead(notification.id);
                                                        }}
                                                        className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"
                                                        title="Marcar como leída"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}