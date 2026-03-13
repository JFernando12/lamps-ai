"use client";

import Link from "next/link";
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  LogOut,
  Zap,
  BarChart3,
  Mail,
  ArrowLeftRight,
  Settings,
} from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pendingTransfers, setPendingTransfers] = useState(0);

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!user?.is_admin || isLoginPage) return;
    api
      .get<{ transfers: { payment_id: string }[] }>(
        '/api/admin/payments/pending-transfers',
      )
      .then((d) => setPendingTransfers(d.transfers?.length ?? 0))
      .catch(() => {});
  }, [user, isLoginPage]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* ── Top bar (desktop) ─────────────────────────────────────── */}
      {!isLoginPage && user?.is_admin && (
        <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#111] border-b border-white/10 flex items-center px-4 md:px-6 justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-400" />
            <span className="font-bold text-sm tracking-wide text-white">
              The Dream <span className="text-amber-400">Gift</span>
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-5 text-sm">
            <Link
              href="/admin/dashboard"
              className={`flex items-center gap-1.5 transition-colors ${
                pathname === '/admin/dashboard'
                  ? 'text-amber-400'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <LayoutDashboard size={15} />
              Pedidos
            </Link>
            <Link
              href="/admin/transferencias"
              className={`relative flex items-center gap-1.5 transition-colors ${
                pathname.startsWith('/admin/transferencias')
                  ? 'text-amber-400'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <ArrowLeftRight size={15} />
              Transferencias
              {pendingTransfers > 0 && (
                <span className="absolute -top-1.5 -right-3 min-w-4 h-4 bg-amber-400 text-black text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {pendingTransfers}
                </span>
              )}
            </Link>
            <Link
              href="/admin/ads"
              className={`flex items-center gap-1.5 transition-colors ${
                pathname.startsWith('/admin/ads')
                  ? 'text-amber-400'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <BarChart3 size={15} />
              Ads
            </Link>
            <Link
              href="/admin/email"
              className={`flex items-center gap-1.5 transition-colors ${
                pathname.startsWith('/admin/email')
                  ? 'text-amber-400'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Mail size={15} />
              Email
            </Link>
            <Link
              href="/admin/configuracion"
              className={`flex items-center gap-1.5 transition-colors ${
                pathname.startsWith('/admin/configuracion')
                  ? 'text-amber-400'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Settings size={15} />
              Config
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors"
            >
              <LogOut size={15} />
              Salir
            </button>
          </nav>

          {/* Mobile: logout button top-right */}
          <button
            onClick={handleLogout}
            className="md:hidden flex items-center gap-1 text-white/40 hover:text-white transition-colors text-xs"
          >
            <LogOut size={15} />
          </button>
        </header>
      )}

      {/* ── Content ───────────────────────────────────────────────── */}
      <div
        className={
          !isLoginPage && user?.is_admin
            ? 'pt-14 pb-16 md:pb-0' /* pb-16 deja espacio para la bottom bar en móvil */
            : ''
        }
      >
        {children}
      </div>

      {/* ── Bottom tab bar (mobile only) ──────────────────────────── */}
      {!isLoginPage && user?.is_admin && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#111] border-t border-white/10 flex items-center justify-around px-2">
          <Link
            href="/admin/dashboard"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
              pathname === '/admin/dashboard'
                ? 'text-amber-400'
                : 'text-white/40'
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px]">Pedidos</span>
          </Link>

          <Link
            href="/admin/transferencias"
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
              pathname.startsWith('/admin/transferencias')
                ? 'text-amber-400'
                : 'text-white/40'
            }`}
          >
            <ArrowLeftRight size={20} />
            {pendingTransfers > 0 && (
              <span className="absolute top-0 right-1 min-w-4 h-4 bg-amber-400 text-black text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {pendingTransfers}
              </span>
            )}
            <span className="text-[10px]">Transfers</span>
          </Link>

          <Link
            href="/admin/ads"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
              pathname.startsWith('/admin/ads')
                ? 'text-amber-400'
                : 'text-white/40'
            }`}
          >
            <BarChart3 size={20} />
            <span className="text-[10px]">Ads</span>
          </Link>

          <Link
            href="/admin/email"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
              pathname.startsWith('/admin/email')
                ? 'text-amber-400'
                : 'text-white/40'
            }`}
          >
            <Mail size={20} />
            <span className="text-[10px]">Email</span>
          </Link>

          <Link
            href="/admin/configuracion"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
              pathname.startsWith('/admin/configuracion')
                ? 'text-amber-400'
                : 'text-white/40'
            }`}
          >
            <Settings size={20} />
            <span className="text-[10px]">Config</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
