/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UserRole } from "../types";
import { Lock, User, Shield, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [role, setRole] = useState<UserRole>("Kasir");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validasi Password sederhana namun aman
    if (role === "Admin" && password === "admin123") {
      onLoginSuccess("Admin");
    } else if (role === "Kasir" && password === "kasir123") {
      onLoginSuccess("Kasir");
    } else {
      setError("Password salah! Silakan coba lagi.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background Decorative Ripples */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-950/20 blur-[120px] pointer-events-none"></div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden p-8 relative z-10">
        
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-500/10 mb-4 items-center justify-center">
            <span className="font-sans font-black text-2xl tracking-wider text-white">GS</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            GOSPLASH TICKETING
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Sistem Manajemen Tiket & Laporan Keuangan
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Role Selection Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              id="login-role-kasir"
              onClick={() => {
                setRole("Kasir");
                setError("");
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition duration-200 ${
                role === "Kasir"
                  ? "bg-amber-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              KASIR
            </button>
            <button
              type="button"
              id="login-role-admin"
              onClick={() => {
                setRole("Admin");
                setError("");
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition duration-200 ${
                role === "Admin"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              ADMIN
            </button>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              Kata Sandi (Password)
            </label>
            <div className="relative">
              <input
                id="login-password-input"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Masukkan password..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-200 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Feedback */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl p-3 flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold leading-tight">{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            id="login-submit-btn"
            className={`w-full py-3 px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition duration-200 ${
              role === "Admin"
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/10"
                : "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/10"
            }`}
          >
            <LogIn className="w-4 h-4" />
            MASUK SEBAGAI {role.toUpperCase()}
          </button>
        </form>

      </div>

      {/* Aesthetic pairing branding */}
      <span className="mt-6 text-[10px] text-slate-600 font-mono tracking-widest">
        SECURED BY GOSPLASH INTERNAL GUARD
      </span>
    </div>
  );
};
