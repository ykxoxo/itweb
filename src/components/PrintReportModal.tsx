'use client';

import React, { useMemo, useState } from 'react';
import type { MaintenanceLog, Room } from '../types';
import { useApp } from '../context/AppContext';
import { aggregateReportData, getLogSubAndSpecs } from '../utils/reportAggregator';
import { Printer, X, Server, CheckCircle2, FileDown, FolderOpen } from 'lucide-react';

export interface PrintReportFilters {
  buildingId?: string;
  roomId?: string;
  dateFrom?: string;
  dateTo?: string;
  includeExplicitVisits?: boolean;
}

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: MaintenanceLog[];
  rooms: Room[];
  periodLabel: string;
  filters?: PrintReportFilters;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  logs,
  rooms,
  periodLabel,
  filters,
}) => {
  const { buildings, visits, desktopStorageInfo, savePdfReportLocal, openLocalFolder, openLocalFile } = useApp();

  // Screen-only toggles so admin can print all sections together or customize before printing
  const [showExecutiveSummary, setShowExecutiveSummary] = useState(true);
  const [showBuildingsTable, setShowBuildingsTable] = useState(true);
  const [showRoomsTable, setShowRoomsTable] = useState(true);
  const [showVisitsTable, setShowVisitsTable] = useState(true);
  const [showOperationsTable, setShowOperationsTable] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [savedPdfInfo, setSavedPdfInfo] = useState<{ filePath: string; fileName: string } | null>(null);

  const report = useMemo(() => {
    return aggregateReportData({
      buildings,
      rooms,
      logs,
      visits,
      filters,
    });
  }, [buildings, rooms, logs, visits, filters]);

  const roomObjMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);

  const todayDate = useMemo(() => {
    return new Date().toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const handlePrint = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.printCurrentPage) {
      await window.electronAPI.printCurrentPage();
      return;
    }
    window.print();
  };

  const handleSavePdfLocal = async () => {
    if (isSavingPdf) return;
    setIsSavingPdf(true);
    try {
      const res = await savePdfReportLocal('تقرير_المخرجات_الشامل');
      if (res?.ok && res.filePath && res.fileName) {
        setSavedPdfInfo({ filePath: res.filePath, fileName: res.fileName });
      }
    } finally {
      setIsSavingPdf(false);
    }
  };

  if (!isOpen) return null;

  const { outputs, assets, byBuilding, byRoom, effectiveVisits, scopedLogs } = report;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 overflow-y-auto print:static print:inset-auto print:bg-white print:p-0 print:block">
      
      {/* Modal Dialog */}
      <div className="bg-white rounded-3xl max-w-6xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:w-full print:m-0 print:p-0 print:overflow-visible">
        
        {/* Screen Controls Header (hidden in print) */}
        <div className="p-4 bg-slate-800 text-white space-y-3 no-print">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-sm">معاينة التقرير الشامل للمخرجات والزيارات</span>
              <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                جاهز للطباعة والحفظ كـ PDF
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {desktopStorageInfo && (
                <button
                  onClick={handleSavePdfLocal}
                  disabled={isSavingPdf}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-sm shadow-md transition-all active:scale-95"
                  title={`حفظ ملف PDF مباشرة في مجلد التقارير المحلي:\n${desktopStorageInfo.reportsDir}`}
                >
                  <FileDown className="w-4 h-4" />
                  <span>{isSavingPdf ? 'جاري إنشاء PDF...' : 'حفظ PDF محلياً'}</span>
                </button>
              )}
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة التقرير الآن (Print / PDF)</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {desktopStorageInfo && savedPdfInfo && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-900/50 border border-emerald-500/40 text-xs text-emerald-100">
              <span>
                تم حفظ التقرير محلياً باسم: <strong className="text-white">{savedPdfInfo.fileName}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openLocalFile(savedPdfInfo.filePath)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
                >
                  فتح ملف PDF
                </button>
                <button
                  onClick={() => openLocalFolder('reports')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>فتح مجلد التقارير</span>
                </button>
              </div>
            </div>
          )}

          {/* Section Customization Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700/80 text-[11px]">
            <span className="text-slate-300 font-bold ml-1">أقسام التقرير المطبوع:</span>
            {[
              { label: 'الملخص التنفيذي للمخرجات', state: showExecutiveSummary, setter: setShowExecutiveSummary },
              { label: 'ملخص المباني', state: showBuildingsTable, setter: setShowBuildingsTable },
              { label: 'تفصيل القاعات والزيارات', state: showRoomsTable, setter: setShowRoomsTable },
              { label: 'سجل الزيارات الميدانية', state: showVisitsTable, setter: setShowVisitsTable },
              { label: 'سجل العمليات التفصيلي', state: showOperationsTable, setter: setShowOperationsTable },
              { label: 'التوقيعات والاعتماد', state: showSignatures, setter: setShowSignatures },
            ].map((toggle) => (
              <label
                key={toggle.label}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                  toggle.state ? 'bg-blue-600/30 text-blue-200 border border-blue-400/50' : 'bg-slate-700/60 text-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={toggle.state}
                  onChange={(e) => toggle.setter(e.target.checked)}
                  className="accent-blue-500 w-3.5 h-3.5"
                />
                <span>{toggle.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-10 overflow-y-auto bg-white text-slate-900 space-y-6 print:p-0 print:overflow-visible">
          
          {/* 1. Official Header */}
          <div className="border-b-2 border-slate-900 pb-4">
            <div className="flex items-center justify-between gap-4">
              
              {/* Right Side: Organization Header */}
              <div className="text-right space-y-1">
                <h3 className="text-xs sm:text-sm font-bold text-slate-700">المملكة العربية السعودية</h3>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">إدارة تقنية المعلومات والاتصالات (IT)</h2>
                <p className="text-[11px] text-slate-600">قسم الصيانة الفنية وإدارة الأصول والقاعات</p>
              </div>

              {/* Center: Official Logo / Emblem */}
              <div className="text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center shadow-sm mb-1 print:border print:border-slate-800 print:bg-white print:text-black">
                  <Server className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-slate-500 font-bold">
                  IT ASSETS HUB
                </span>
              </div>

              {/* Left Side: Report Metadata */}
              <div className="text-left space-y-0.5 text-[11px] text-slate-600" dir="ltr">
                <div><strong className="text-slate-800">Date:</strong> {todayDate}</div>
                <div><strong className="text-slate-800">Ref:</strong> IT-REP-{new Date().getFullYear()}-{scopedLogs.length}-{report.totalRoomVisits}</div>
                <div><strong className="text-slate-800">Status:</strong> COMPREHENSIVE REPORT</div>
              </div>

            </div>

            {/* Document Title Banner */}
            <div className="mt-4 text-center bg-slate-100 py-2.5 px-4 rounded-xl border border-slate-300">
              <h1 className="text-base sm:text-lg font-black text-slate-900">
                التقرير الشامل لمخرجات الصيانة والترقيات وزيارات القاعات والمباني
              </h1>
              <p className="text-xs font-bold text-blue-800 mt-0.5">
                {periodLabel}
              </p>
            </div>
          </div>

          {/* 2. Executive KPI Summary Box */}
          {showExecutiveSummary && (
            <div className="space-y-3 print-break-inside-avoid">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 border-b border-slate-300 pb-1">
                <span>أولاً: الملخص التنفيذي للمخرجات التقنية والزيارات</span>
                <span className="text-[10px] font-normal text-slate-500">
                  القاعدة المعتمدة للزيارة: كل يوم فريد للقاعة = زيارة واحدة
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 print:grid-cols-5">
                {[
                  { label: 'أجهزة تمت صيانتها', value: outputs.devicesMaintained, sub: 'جهاز (صيانة عامة)' },
                  { label: 'أجهزة تم تحديثها', value: outputs.devicesUpdated, sub: 'جهاز محدث' },
                  { label: 'ترقية رام (RAM)', value: outputs.devicesUpgraded, sub: 'جهاز مرقى' },
                  { label: 'هاردسكات مبدلة', value: outputs.hardDrivesReplaced, sub: 'SSD / HDD' },
                  { label: 'باور سبلاي مبدل', value: outputs.powerSuppliesReplaced, sub: 'وحدة طاقة' },
                  { label: 'شاشات مبدلة / مركبة', value: outputs.screensReplaced, sub: `صيانة شاشات: ${outputs.screensMaintained}` },
                  { label: 'أجهزة كاملة مستبدلة', value: outputs.devicesReplaced, sub: 'جهاز مستبدل' },
                  { label: 'ملحقات مستبدلة', value: outputs.itemsReplaced, sub: `ماوس ${outputs.miceReplaced} • كيبورد ${outputs.keyboardsReplaced}` },
                  { label: 'زيارات القاعات', value: report.totalRoomVisits, sub: `من أصل ${byRoom.length} قاعة` },
                  { label: 'أيام زيارة المباني', value: report.totalBuildingVisitDays, sub: `عبر ${byBuilding.length} مبنى` },
                ].map((kpi) => (
                  <div key={kpi.label} className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-center">
                    <span className="text-[10px] block font-bold text-slate-600">{kpi.label}</span>
                    <span className="text-lg font-black text-slate-900 mt-0.5 block">{kpi.value}</span>
                    <span className="text-[9px] text-slate-500 block">{kpi.sub}</span>
                  </div>
                ))}
              </div>

              {/* Live Hardware Readiness Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2.5 rounded-xl bg-slate-100/80 border border-slate-300 text-center text-[10px]">
                <div>
                  <span className="text-slate-600 font-bold block">إجمالي العمليات المنفذة</span>
                  <strong className="text-sm font-black text-slate-900">{outputs.totalOperations} عملية</strong>
                </div>
                <div>
                  <span className="text-slate-600 font-bold block">إجمالي الأجهزة بالقاعات</span>
                  <strong className="text-sm font-black text-slate-900">{assets.totalInstalledDevices} جهاز</strong>
                </div>
                <div>
                  <span className="text-emerald-700 font-bold block">أجهزة جاهزة / محدثة حالياً</span>
                  <strong className="text-sm font-black text-emerald-800">{assets.devicesReadyCount} جهاز</strong>
                </div>
                <div>
                  <span className="text-rose-700 font-bold block">تحتاج صيانة حالياً</span>
                  <strong className="text-sm font-black text-rose-800">{assets.devicesNeedMaintenanceCount} جهاز</strong>
                </div>
                <div>
                  <span className="text-blue-700 font-bold block">نسبة الجاهزية العامة</span>
                  <strong className="text-sm font-black text-blue-900">{assets.readinessPercent}%</strong>
                </div>
              </div>
            </div>
          )}

          {/* 3. Building-level Outputs & Visits Summary */}
          {showBuildingsTable && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 border-b border-slate-300 pb-1">
                <span>ثانياً: ملخص المخرجات والزيارات حسب المباني ({byBuilding.length} مبنى)</span>
              </div>

              <table className="w-full text-right text-[10px] border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                    <th className="py-1.5 px-2 border-r border-slate-400">المبنى</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 text-center">القاعات</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 text-center">الأجهزة</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 text-center">الجاهزية</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 text-center">أيام زيارة المبنى</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 text-center">زيارات القاعات</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 text-center">العمليات</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 text-center">صيانة</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 text-center">تحديث</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 text-center">رام</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 text-center">هاردسك</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 text-center">باور</th>
                    <th className="py-1.5 px-1.5 text-center">شاشات</th>
                  </tr>
                </thead>
                <tbody>
                  {byBuilding.map((b, idx) => (
                    <tr key={b.building.id} className={`border-b border-slate-300 ${idx % 2 === 1 ? 'bg-slate-50' : ''}`}>
                      <td className="py-1.5 px-2 border-r border-slate-300 font-bold">{b.building.name}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-center">{b.roomsCount}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-center">{b.assets.totalInstalledDevices}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-center font-bold">{b.assets.readinessPercent}%</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-center font-bold">{b.visitDaysCount}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-center font-bold">{b.roomVisitsTotal}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-center">{b.outputs.totalOperations}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-center">{b.outputs.devicesMaintained}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-center">{b.outputs.devicesUpdated}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-center">{b.outputs.devicesUpgraded}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-center">{b.outputs.hardDrivesReplaced}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-center">{b.outputs.powerSuppliesReplaced}</td>
                      <td className="py-1.5 px-1.5 text-center">{b.outputs.screensReplaced}</td>
                    </tr>
                  ))}
                  {byBuilding.length > 0 && (
                    <tr className="bg-slate-200/80 font-black border-t-2 border-slate-400">
                      <td className="py-1.5 px-2 border-r border-slate-400">الإجمالي العام</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-400 text-center">{byRoom.length}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-400 text-center">{assets.totalInstalledDevices}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-400 text-center">{assets.readinessPercent}%</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-400 text-center">{report.totalBuildingVisitDays}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-400 text-center">{report.totalRoomVisits}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-400 text-center">{outputs.totalOperations}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-400 text-center">{outputs.devicesMaintained}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-400 text-center">{outputs.devicesUpdated}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-400 text-center">{outputs.devicesUpgraded}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-400 text-center">{outputs.hardDrivesReplaced}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-400 text-center">{outputs.powerSuppliesReplaced}</td>
                      <td className="py-1.5 px-1.5 text-center">{outputs.screensReplaced}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. Room-level Outputs & Visits Breakdown */}
          {showRoomsTable && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 border-b border-slate-300 pb-1">
                <span>ثالثاً: تفصيل القاعات والزيارات والجاهزية ({byRoom.length} قاعة)</span>
              </div>

              <table className="w-full text-right text-[10px] border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                    <th className="py-1.5 px-1.5 border-r border-slate-400">المبنى</th>
                    <th className="py-1.5 px-2 border-r border-slate-400">القاعة</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 text-center">حالة الشاشة</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 text-center">الأجهزة (جاهز/كلي)</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 text-center">الزيارات</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 text-center">آخر زيارة</th>
                    <th className="py-1.5 px-1 border-r border-slate-400 text-center">صيانة</th>
                    <th className="py-1.5 px-1 border-r border-slate-400 text-center">تحديث</th>
                    <th className="py-1.5 px-1 border-r border-slate-400 text-center">رام</th>
                    <th className="py-1.5 px-1 border-r border-slate-400 text-center">هاردسك</th>
                    <th className="py-1.5 px-1 border-r border-slate-400 text-center">باور</th>
                    <th className="py-1.5 px-1 border-r border-slate-400 text-center">شاشات</th>
                    <th className="py-1.5 px-1 text-center">ملحقات</th>
                  </tr>
                </thead>
                <tbody>
                  {byRoom.map((r, idx) => (
                    <tr key={r.room.id} className={`border-b border-slate-300 ${idx % 2 === 1 ? 'bg-slate-50' : ''}`}>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-slate-600">{r.buildingName}</td>
                      <td className="py-1.5 px-2 border-r border-slate-300 font-bold">{r.room.name}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-center">{r.room.screenStatus}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-center font-semibold">
                        {r.assets.devicesReadyCount} / {r.assets.totalInstalledDevices}
                      </td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-center font-black">{r.visitsCount}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-center whitespace-nowrap">
                        {r.lastVisitDate || '-'}
                      </td>
                      <td className="py-1.5 px-1 border-r border-slate-300 text-center">{r.outputs.devicesMaintained}</td>
                      <td className="py-1.5 px-1 border-r border-slate-300 text-center">{r.outputs.devicesUpdated}</td>
                      <td className="py-1.5 px-1 border-r border-slate-300 text-center">{r.outputs.devicesUpgraded}</td>
                      <td className="py-1.5 px-1 border-r border-slate-300 text-center">{r.outputs.hardDrivesReplaced}</td>
                      <td className="py-1.5 px-1 border-r border-slate-300 text-center">{r.outputs.powerSuppliesReplaced}</td>
                      <td className="py-1.5 px-1 border-r border-slate-300 text-center">{r.outputs.screensReplaced}</td>
                      <td className="py-1.5 px-1 text-center">{r.outputs.itemsReplaced}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. Field Visits Log Table */}
          {showVisitsTable && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 border-b border-slate-300 pb-1">
                <span>رابعاً: سجل الزيارات الميدانية للقاعات ({effectiveVisits.length} زيارة محتسبة)</span>
              </div>

              <table className="w-full text-right text-[10px] border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                    <th className="py-1.5 px-1.5 border-r border-slate-400 w-8 text-center">#</th>
                    <th className="py-1.5 px-2 border-r border-slate-400 w-20">التاريخ</th>
                    <th className="py-1.5 px-2 border-r border-slate-400 w-28">المبنى</th>
                    <th className="py-1.5 px-2 border-r border-slate-400 w-28">القاعة</th>
                    <th className="py-1.5 px-2 border-r border-slate-400 w-28">نوع الزيارة</th>
                    <th className="py-1.5 px-1.5 border-r border-slate-400 w-16 text-center">العمليات</th>
                    <th className="py-1.5 px-2 border-r border-slate-400 w-24">الفني / الزائر</th>
                    <th className="py-1.5 px-2">ملخص الزيارة والأعمال</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveVisits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-4 text-center text-slate-400">
                        لا توجد زيارات مسجلة خلال هذه الفترة
                      </td>
                    </tr>
                  ) : (
                    effectiveVisits.map((ev, idx) => (
                      <tr key={ev.id} className={`border-b border-slate-300 ${idx % 2 === 1 ? 'bg-slate-50' : ''}`}>
                        <td className="py-1.5 px-1.5 text-center border-r border-slate-300 font-mono">{idx + 1}</td>
                        <td className="py-1.5 px-2 border-r border-slate-300 whitespace-nowrap">{ev.date}</td>
                        <td className="py-1.5 px-2 border-r border-slate-300">{ev.buildingName}</td>
                        <td className="py-1.5 px-2 border-r border-slate-300 font-bold">{ev.roomName}</td>
                        <td className="py-1.5 px-2 border-r border-slate-300">{ev.source}</td>
                        <td className="py-1.5 px-1.5 border-r border-slate-300 text-center font-bold">{ev.operationsCount}</td>
                        <td className="py-1.5 px-2 border-r border-slate-300">{ev.executors.join('، ') || '-'}</td>
                        <td className="py-1.5 px-2 leading-relaxed">{ev.notes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 6. Maintenance Operations Table */}
          {showOperationsTable && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 border-b border-slate-300 pb-1">
                <span>خامساً: سجل تفاصيل العمليات الفنية المنفذة ({scopedLogs.length} عملية)</span>
              </div>

              <table className="w-full text-right text-[10px] border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                    <th className="py-1.5 px-1.5 border-r border-slate-400 w-8 text-center">#</th>
                    <th className="py-1.5 px-2 border-r border-slate-400 w-20">التاريخ</th>
                    <th className="py-1.5 px-2 border-r border-slate-400 w-24">المبنى</th>
                    <th className="py-1.5 px-2 border-r border-slate-400 w-28">القاعة</th>
                    <th className="py-1.5 px-2 border-r border-slate-400 w-24">نوع العملية</th>
                    <th className="py-1.5 px-2 border-r border-slate-400 w-32">التصنيف والمواصفات</th>
                    <th className="py-1.5 px-2 border-r border-slate-400">تفاصيل العمل المنجز</th>
                    <th className="py-1.5 px-2 w-24">اسم المنفذ</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-5 text-center text-slate-400">
                        لا توجد عمليات مسجلة خلال هذه الفترة
                      </td>
                    </tr>
                  ) : (
                    scopedLogs.map((log, index) => {
                      const room = roomObjMap.get(log.roomId);
                      const roomName = room?.name || 'غير محدد';
                      const buildingName = room?.buildingId ? buildingMap.get(room.buildingId) || '-' : '-';
                      const { subAndCount, specs } = getLogSubAndSpecs(log);

                      return (
                        <tr
                          key={log.id}
                          className={`border-b border-slate-300 ${index % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}
                        >
                          <td className="py-1.5 px-1.5 text-center border-r border-slate-300 font-mono">{index + 1}</td>
                          <td className="py-1.5 px-2 border-r border-slate-300 whitespace-nowrap">{log.date}</td>
                          <td className="py-1.5 px-2 border-r border-slate-300 whitespace-nowrap">{buildingName}</td>
                          <td className="py-1.5 px-2 border-r border-slate-300 font-bold">{roomName}</td>
                          <td className="py-1.5 px-2 border-r border-slate-300 font-semibold">{log.category}</td>
                          <td className="py-1.5 px-2 border-r border-slate-300">
                            <div>{subAndCount}</div>
                            {specs && <div className="text-slate-500 text-[9px]">{specs}</div>}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-300 leading-relaxed">
                            {log.actionDetails || '-'}
                          </td>
                          <td className="py-1.5 px-2 whitespace-nowrap">{log.executorName || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 7. Official Signatures and Approval Section */}
          {showSignatures && (
            <div className="pt-6 print:pt-8 print-break-inside-avoid">
              <div className="grid grid-cols-2 gap-8 border-t-2 border-slate-800 pt-5">
                
                {/* Executor Signature */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-700" />
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900">إعداد وتوقيع المنفذ / الفني:</span>
                  </div>
                  <div className="space-y-2.5 text-xs text-slate-700 pr-2">
                    <div className="flex items-baseline">
                      <span className="w-20 font-bold">الاسم:</span>
                      <span className="border-b border-dashed border-slate-400 flex-1 pb-3"></span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-20 font-bold">التوقيع:</span>
                      <span className="border-b border-dashed border-slate-400 flex-1 pb-3"></span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-20 font-bold">التاريخ:</span>
                      <span className="border-b border-dashed border-slate-400 flex-1 pb-1">{todayDate}</span>
                    </div>
                  </div>
                </div>

                {/* IT Manager Approval */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-700" />
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900">اعتماد مدير تقنية المعلومات:</span>
                  </div>
                  <div className="space-y-2.5 text-xs text-slate-700 pr-2">
                    <div className="flex items-baseline">
                      <span className="w-20 font-bold">الاسم:</span>
                      <span className="border-b border-dashed border-slate-400 flex-1 pb-3"></span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-20 font-bold">التوقيع والختم:</span>
                      <span className="border-b border-dashed border-slate-400 flex-1 pb-3"></span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-20 font-bold">التاريخ:</span>
                      <span className="border-b border-dashed border-slate-400 flex-1 pb-3"></span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Document Footer Note */}
              <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500">
                تم استخراج هذا التقرير الشامل آلياً عبر نظام إدارة أصول التقنية وصيانة القاعات (IT Assets Hub) • وثيقة رسمية معتمدة.
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
