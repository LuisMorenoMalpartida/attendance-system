import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import AuthWrapper from '@/components/shared/AuthWrapper';
import Providers from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sistema de Asistencia',
  description: 'Sistema de registro de asistencia laboral',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <main className="min-h-screen bg-background">
          <Providers>
            <AuthWrapper>{children}</AuthWrapper>
          </Providers>
        </main>
        <Toaster />
      </body>
    </html>
  );
}