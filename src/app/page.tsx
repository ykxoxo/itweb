'use client';

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import { Navbar } from '../components/Navbar';
import { Dashboard } from '../components/Dashboard';
import { RoomsList } from '../components/RoomsList';
import { RoomModal } from '../components/RoomModal';
import { MaintenanceForm } from '../components/MaintenanceForm';
import { ReportsView } from '../components/ReportsView';
import { PrintReportModal } from '../components/PrintReportModal';
import { ToastContainer } from '../components/ToastContainer';
import type { MaintenanceLog } from '../types';
import { Server, Heart, Loader2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeTab, rooms, logs, selectedRoomIdForModal } = useApp();

  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printLogs, setPrintLogs] = useState<MaintenanceLog[]>(logs);
  const [printPeriodLabel, setPrintPeriodLabel] = useState<string>('التقرير الشامل لكافة الفترات');

  const handleOpenPrintModalDefault = () => {
    setPrintLogs(logs);
    setPrintPeriodLabel('التقرير الإحصائي الشامل للأعمال الفنية');
    setIsPrintModalOpen(true);
  };

  const handleOpenPrintModalWithLogs = (selectedLogs: MaintenanceLog[], periodLabel: string) => {
    setPrintLogs(selectedLogs);
    setPrintPeriodLabel(periodLabel);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <Dashboard onOpenPrintModal={handleOpenPrintModalDefault} />
        )}
        {activeTab === 'rooms' && <RoomsList />}
        {activeTab === 'add-log' && <MaintenanceForm />}
        {activeTab === 'reports' && (
          <ReportsView onOpenPrintModalWithLogs={handleOpenPrintModalWithLogs} />
        )}
      </main>

      {/* Room Detail Modal - only rendered when selected */}
      {selectedRoomIdForModal && <RoomModal />}

      {/* Print Management Report Modal - only rendered when open */}
      {isPrintModalOpen && (
        <PrintReportModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          logs={printLogs}
          rooms={rooms}
          periodLabel={printPeriodLabel}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Modern Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 no-print mt-auto transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-slate-700 dark:text-slate-200">نظام إدارة أصول التقنية وصيانة القاعات (IT Hub)</span>
            <span>•</span>
            <span>نظام فني وإحصائي متكامل</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
            <span>تم التطوير لدعم فِرق تقنية المعلومات</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
          <span>جاري تشغيل النظام...</span>
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
