'use client';

import React, { useMemo } from 'react';
import type { MaintenanceLog, Room } from '../types';
import { useApp } from '../context/AppContext';
import { Printer, X, Server, CheckCircle2 } from 'lucide-react';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: MaintenanceLog[];
  rooms: Room[];
  periodLabel: string;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  logs,
  rooms,
  periodLabel,
}) => {
  const { buildings } = useApp();
  const roomObjMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);

  // Memoize counters
  const { devicesMaintained, devicesUpgraded, devicesUpdated, devicesReplaced } = useMemo(() => {
    let maintained = 0;
    let upgraded = 0;
    let updated = 0;
    let replaced = 0;

    for (let i = 0; i < logs.length; i++) {
      const l = logs[i];
      const count = Number(l.devicesCount) || 1;
      if (l.category === 'صيانة عامة') {
        if (l.generalSubType === 'تحديث') updated += count;
        else maintained += count;
      } else if (l.category === 'ترقية رام') {
        upgraded += count;
      } else if (l.category === 'استبدال') {
        replaced += count;
      }
    }

    return {
      devicesMaintained: maintained,
      devicesUpgraded: upgraded,
      devicesUpdated: updated,
      devicesReplaced: replaced,
    };
  }, [logs]);

  const todayDate = useMemo(() => {
    return new Date().toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 overflow-y-auto">
      
      {/* Modal Dialog */}
      <div className="bg-white rounded-3xl max-w-5xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:w-full print:m-0 print:p-0">
        
        {/* Screen Controls Header (hidden in print) */}
        <div className="p-4 bg-slate-800 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm">معاينة قالب طباعة تقرير الإدارة</span>
            <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
              جاهز للطباعة والحفظ كـ PDF
            </span>
          </div>

          <div className="flex items-center gap-3">
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

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto bg-white text-slate-900 space-y-6 print:p-0 print:overflow-visible">
          
          {/* 1. Official Header */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex items-center justify-between">
              
              {/* Right Side: Organization Header */}
              <div className="text-right space-y-1">
                <h3 className="text-sm font-bold text-slate-700">المملكة العربية السعودية</h3>
                <h2 className="text-base font-extrabold text-slate-900">إدارة تقنية المعلومات والاتصالات (IT)</h2>
                <p className="text-xs text-slate-600">قسم الصيانة الفنية وإدارة الأصول والقاعات</p>
              </div>

              {/* Center: Official Logo / Emblem */}
              <div className="text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-700 text-white flex items-center justify-center shadow-sm mb-1.5 print:border print:border-slate-800 print:bg-white print:text-black">
                  <Server className="w-8 h-8" />
                </div>
                <span className="text-[11px] font-mono tracking-widest uppercase text-slate-500 font-bold">
                  IT ASSETS HUB
                </span>
              </div>

              {/* Left Side: Report Metadata */}
              <div className="text-left space-y-1 text-xs text-slate-600" dir="ltr">
                <div><strong className="text-slate-800">Date:</strong> {todayDate}</div>
                <div><strong className="text-slate-800">Ref:</strong> IT-REP-{new Date().getFullYear()}-{logs.length}</div>
                <div><strong className="text-slate-800">Status:</strong> OFFICIAL REPORT</div>
              </div>

            </div>

            {/* Document Title Banner */}
            <div className="mt-6 text-center bg-slate-100 py-3 rounded-xl border border-slate-300 print:bg-slate-100">
              <h1 className="text-lg sm:text-xl font-black text-slate-900">
                تقرير الأعمال الفنية وصيانة الأصول والترقيات
              </h1>
              <p className="text-xs font-bold text-blue-800 mt-1">
                {periodLabel}
              </p>
            </div>
          </div>

          {/* 2. Executive KPI Summary Box (Detailed Device Metrics) */}
          <div className="grid grid-cols-4 gap-3 print:gap-2">
            <div className="p-3 rounded-xl border border-slate-300 bg-slate-50 text-center">
              <span className="text-[11px] block font-bold text-slate-600">أجهزة تمت صيانتها</span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block">{devicesMaintained}</span>
              <span className="text-[10px] text-slate-500">جهاز</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-300 bg-slate-50 text-center">
              <span className="text-[11px] block font-bold text-slate-600">أجهزة تمت ترقيتها (رام)</span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block">{devicesUpgraded}</span>
              <span className="text-[10px] text-slate-500">جهاز مرقى</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-300 bg-slate-50 text-center">
              <span className="text-[11px] block font-bold text-slate-600">أجهزة تم تحديثها</span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block">{devicesUpdated}</span>
              <span className="text-[10px] text-slate-500">جهاز محدث</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-300 bg-slate-50 text-center">
              <span className="text-[11px] block font-bold text-slate-600">أجهزة وقطع مستبدلة</span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block">{devicesReplaced}</span>
              <span className="text-[10px] text-slate-500">مستبدل</span>
            </div>
          </div>

          {/* 3. Maintenance Operations Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>جدول تفاصيل العمليات الفنية المنفذة ({logs.length} عملية):</span>
              <span>سجل العمليات المعتمد</span>
            </div>

            <table className="w-full text-right text-xs border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                  <th className="py-2 px-2 border-r border-slate-400 w-10 text-center">#</th>
                  <th className="py-2 px-2.5 border-r border-slate-400 w-24">التاريخ</th>
                  <th className="py-2 px-2.5 border-r border-slate-400 w-28">المبنى</th>
                  <th className="py-2 px-2.5 border-r border-slate-400 w-32">القاعة / المعمل</th>
                  <th className="py-2 px-2.5 border-r border-slate-400 w-24">نوع العملية</th>
                  <th className="py-2 px-2.5 border-r border-slate-400 w-36">التصنيف / الماركة / العدد</th>
                  <th className="py-2 px-2.5 border-r border-slate-400">تفاصيل العمل المنجز</th>
                  <th className="py-2 px-2.5 w-24">اسم المنفذ</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      لا توجد عمليات مسجلة خلال هذه الفترة
                    </td>
                  </tr>
                ) : (
                  logs.map((log, index) => {
                    const room = roomObjMap.get(log.roomId);
                    const roomName = room?.name || 'غير محدد';
                    const buildingName = room?.buildingId ? (buildingMap.get(room.buildingId) || '-') : '-';

                    let subAndCount = '-';
                    if (log.category === 'صيانة عامة' && log.generalSubType) {
                      subAndCount = `${log.generalSubType} ${log.devicesCount ? `(${log.devicesCount})` : ''}`;
                    } else if (log.category === 'استبدال' && log.replacementSubType) {
                      subAndCount = `${log.replacementSubType} ${log.devicesCount ? `(${log.devicesCount})` : log.itemsCount ? `(${log.itemsCount})` : ''}`;
                    } else if (log.category === 'ترقية رام') {
                      subAndCount = log.devicesCount ? `${log.devicesCount} جهاز` : 'ترقية رام';
                    }

                    let specs = log.deviceBrand || '';
                    if (log.category === 'استبدال' && log.oldDevice && log.newDevice) {
                      specs = `${log.oldDevice.nameOrBrand || ''} ⬅ ${log.newDevice.nameOrBrand || ''}`;
                    } else if (log.category === 'ترقية رام' && (log.previousRam || log.newRam)) {
                      specs = `${log.previousRam || ''} ⬅ ${log.newRam || ''}`;
                    }

                    return (
                      <tr
                        key={log.id}
                        className={`border-b border-slate-300 ${index % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}
                      >
                        <td className="py-2 px-2 text-center border-r border-slate-300 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-300 whitespace-nowrap text-[11px]">
                          {log.date}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-300 text-[11px] whitespace-nowrap">
                          {buildingName}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-300 font-bold text-[11px]">
                          {roomName}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-300 font-semibold text-[11px]">
                          {log.category}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-300 text-[10px]">
                          <div>{subAndCount}</div>
                          {specs && <div className="text-slate-500">{specs}</div>}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-300 text-[11px] leading-relaxed">
                          {log.actionDetails || '-'}
                        </td>
                        <td className="py-2 px-2.5 text-[11px] whitespace-nowrap">
                          {log.executorName || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Official Signatures and Approval Section */}
          <div className="pt-8 print:pt-10 print-break-inside-avoid">
            <div className="grid grid-cols-2 gap-8 border-t-2 border-slate-800 pt-6">
              
              {/* Executor Signature */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-700" />
                  <span className="font-extrabold text-sm text-slate-900">إعداد وتوقيع المنفذ:</span>
                </div>
                <div className="space-y-3 text-xs text-slate-700 pr-2">
                  <div className="flex items-baseline">
                    <span className="w-20 font-bold">الاسم:</span>
                    <span className="border-b border-dashed border-slate-400 flex-1 pb-4"></span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-20 font-bold">التوقيع:</span>
                    <span className="border-b border-dashed border-slate-400 flex-1 pb-4"></span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-20 font-bold">التاريخ:</span>
                    <span className="border-b border-dashed border-slate-400 flex-1 pb-1">{todayDate}</span>
                  </div>
                </div>
              </div>

              {/* IT Manager Approval */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-700" />
                  <span className="font-extrabold text-sm text-slate-900">اعتماد مدير تقنية المعلومات:</span>
                </div>
                <div className="space-y-3 text-xs text-slate-700 pr-2">
                  <div className="flex items-baseline">
                    <span className="w-20 font-bold">الاسم:</span>
                    <span className="border-b border-dashed border-slate-400 flex-1 pb-4"></span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-20 font-bold">التوقيع والختم:</span>
                    <span className="border-b border-dashed border-slate-400 flex-1 pb-4"></span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-20 font-bold">التاريخ:</span>
                    <span className="border-b border-dashed border-slate-400 flex-1 pb-4"></span>
                  </div>
                </div>
              </div>

            </div>

            {/* Document Footer Note */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
              تم استخراج هذا التقرير آلياً عبر نظام إدارة أصول التقنية وصيانة القاعات (IT Assets Hub) • وثيقة رسمية معتمدة.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
