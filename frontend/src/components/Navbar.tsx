"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Package, LayoutDashboard, Menu, X } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Admin has its own layout — hide customer navbar on all /admin/* routes
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/70 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-bold text-lg tracking-tight text-amber-400"
        >
          The Dream<span className="text-white"> Gift</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {user ? (
            <>
              {user.is_admin ? (
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300"
                >
                  <LayoutDashboard size={15} />
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/mi-cuenta/pedidos"
                  className="flex items-center gap-1.5 text-white/70 hover:text-white"
                >
                  <Package size={15} />
                  Mis pedidos
                </Link>
              )}
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-white/50 hover:text-white"
              >
                <LogOut size={15} />
                Salir
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-white/70 hover:text-white transition-colors"
            >
              Mi cuenta
            </Link>
          )}
          {!user?.is_admin && (
            <Link
              href="/checkout"
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-full text-sm transition-colors"
            >
              Pedir ahora
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-black border-t border-white/10 px-4 py-4 flex flex-col gap-4 text-sm">
          {user ? (
            <>
              {user.is_admin ? (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setOpen(false)}
                  className="text-amber-400"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/mi-cuenta/pedidos"
                  onClick={() => setOpen(false)}
                  className="text-white/70"
                >
                  Mis pedidos
                </Link>
              )}
              <button
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="text-white/50 text-left"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="text-white/70"
            >
              Mi cuenta
            </Link>
          )}
          {!user?.is_admin && (
            <Link
              href="/checkout"
              onClick={() => setOpen(false)}
              className="bg-amber-500 text-black font-semibold px-4 py-2 rounded-full text-center"
            >
              Pedir ahora
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
