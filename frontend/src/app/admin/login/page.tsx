"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (!authLoading && user?.is_admin) {
      router.replace("/admin/dashboard");
    }
  }, [user, authLoading, router]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const u = await login(email, password);
      if (!u.is_admin) {
        setError("Esta cuenta no tiene permisos de administrador.");
        return;
      }
      router.push("/admin/dashboard");
    } catch {
      setError("Credenciales incorrectas o sin acceso de administrador.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <Zap size={28} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Panel de administración</h1>
          <p className="text-white/40 text-sm mt-1">Acceso restringido</p>
        </div>

        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-1.5">Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              autoComplete="username"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/60 transition-colors"
            />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-1.5">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/60 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
