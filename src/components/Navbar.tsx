'use client';

import React, { useState, useRef } from 'react';
import { useApp, type TabType } from '../context/AppContext';
import {
  LayoutDashboard,
  Building2,
  Wrench,
  FileSpreadsheet,
  Download,
  Upload,
  RotateCcw,
  Menu,
  X,
  Server,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    exportBackupJson,
    importBackupJson,
    resetToDefaultData,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importBackupJson(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResetConfirm = () => {
    if (window.confirm('هل أنت متأكد من إعادة ضبط البيانات إلى الحالة التجريبية الافتراضية؟ سيتم استبدال البيانات الحالية.')) {
      resetToDefaultData();
    }
  };

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'rooms', label: 'إدارة القاعات', icon: <Building2 className="w-5 h-5" /> },
    { id: 'add-log', label: 'إضافة عملية', icon: <Wrench className="w-5 h-5" /> },
    { id: 'reports', label: 'سجل العمليات والتقارير', icon: <FileSpreadsheet className="w-5 h-5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Server className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight font-sans">
                  نظام صيانة الأصول والقاعات
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-200/60 hidden sm:inline-block">
                  IT Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                إدارة القاعات والأجهزة • ترقية الرام والشاشات • الصيانة الدورية
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/70">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-blue-700 shadow-xs shadow-slate-300/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Backup & System utilities */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={exportBackupJson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors text-xs font-semibold border border-slate-200/60"
              title="تصدير نسخة احتياطية من البيانات (JSON)"
            >
              <Download className="w-4 h-4 text-blue-500" />
              <span>نسخ احتياطي</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors text-xs font-semibold border border-slate-200/60"
              title="استيراد نسخة احتياطية (JSON)"
            >
              <Upload className="w-4 h-4 text-blue-500" />
              <span>استيراد</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <button
              onClick={handleResetConfirm}
              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
              title="إعادة ضبط للبيانات الافتراضية"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="القائمة الرئيسية"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                exportBackupJson();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>نسخ JSON</span>
            </button>
            <button
              onClick={() => {
                fileInputRef.current?.click();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>استيراد</span>
            </button>
            <button
              onClick={() => {
                handleResetConfirm();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1 py-2 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
