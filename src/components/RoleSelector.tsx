/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserRole } from "../types";
import { Shield, User, Clock, Printer, LogOut } from "lucide-react";
import { translations, Language } from "../utils/lang";
import { subscribeToPrinterState, PrinterDevice } from "../utils/printer";

interface RoleSelectorProps {
  activeRole: UserRole;
  onLogout: () => void;
  printerName: string;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  activeRole,
  onLogout,
  printerName,
  language,
  onLanguageChange,
}) => {
  const [time, setTime] = useState<string>("");
  const [activeDevice, setActiveDevice] = useState<PrinterDevice>({
    type: "none",
    name: "Tidak Terhubung",
    rawDevice: null
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to global active printer state
  useEffect(() => {
    const unsubscribe = subscribeToPrinterState((device) => {
      setActiveDevice(device);
    });
    return unsubscribe;
  }, []);

  const t = translations[language];
  const isHardwareConnected = activeDevice.type !== "none";

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2.5 rounded-lg shadow-inner flex items-center justify-center">
            <span className="font-sans font-black text-xl tracking-wider text-white">GS</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {t.title}
            </h1>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Live Clock, Thermal Printer Info, Language Selector */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300 font-mono">
          <div className="flex items-center gap-1 bg-slate-850 p-1 rounded-lg border border-slate-700/50">
            <button
              onClick={() => onLanguageChange("ID")}
              className={`px-2 py-1 text-[10px] font-black rounded transition ${
                language === "ID"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ID
            </button>
            <button
              onClick={() => onLanguageChange("EN")}
              className={`px-2 py-1 text-[10px] font-black rounded transition ${
                language === "EN"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              EN
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-md border border-slate-700/50">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>{time || "00:00:00"}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-md border border-slate-700/50">
            <Printer className={`w-4 h-4 ${isHardwareConnected ? "text-emerald-400" : "text-amber-500"}`} />
            <span className="text-xs">
              Thermal:{" "}
              <strong className={isHardwareConnected ? "text-emerald-400" : "text-white"}>
                {isHardwareConnected ? activeDevice.name : printerName}
              </strong>
              {isHardwareConnected && (
                <span className="ml-1.5 inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              )}
            </span>
          </div>
        </div>

        {/* Logged In User Indicator & Log Out button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-4 py-2 rounded-xl">
            {activeRole === "Admin" ? (
              <Shield className="w-4 h-4 text-blue-400" />
            ) : (
              <User className="w-4 h-4 text-amber-400" />
            )}
            <span className="text-xs font-semibold text-slate-400 font-sans">
              {t.user}:{" "}
              <strong className={`font-bold uppercase tracking-wider ${
                activeRole === "Admin" ? "text-blue-400" : "text-amber-400"
              }`}>
                {activeRole === "Admin" ? "ADMIN" : "KASIR"}
              </strong>
            </span>
          </div>

          <button
            id="logout-btn"
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500 text-rose-400 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition duration-200 shadow-sm shadow-rose-950/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t.logout}
          </button>
        </div>
      </div>
    </header>
  );
};
