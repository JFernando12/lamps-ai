"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface User {
  email: string;
  name: string;
  is_admin: boolean;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) {
      setToken(t);
      api
        .get<User>("/api/auth/me")
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("token");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post<{ token: string; email: string; name: string; is_admin: boolean }>(
      "/api/auth/login",
      { email, password }
    );
    localStorage.setItem("token", res.token);
    setToken(res.token);
    const u: User = { email: res.email, name: res.name, is_admin: res.is_admin };
    setUser(u);
    return u;
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await api.post<{ token: string; email: string; name: string }>(
      "/api/auth/register",
      { email, password, name }
    );
    localStorage.setItem("token", res.token);
    setToken(res.token);
    setUser({ email: res.email, name: res.name, is_admin: false });
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
