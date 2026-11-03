'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { OperationCategory, MaintenanceLog } from '../types';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  Building2,
  User,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';

export const ReportsView: React.FC<{ onOpenPrintModalWithLogs: (logs: MaintenanceLog[], periodLabel: string) => void }> = ({
  onOpenPrintModalWithLogs,
}) => {
  const { rooms, logs, deleteLog, updateLog, exportLogsToExcel, setSelectedRoomIdForModal } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Inline editing state
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editDetails, setEditDetails] = useState<string>('');
  const [editCategory, setEditCategory] = useState<OperationCategory>('صيانة عامة');
  const [editExecutor, setEditExecutor] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editBrand, setEditBrand] = useState<string>('');
  const [editCount, setEditCount] = useState<string>('');

  // Extract unique months from logs
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    logs.forEach((log) => {
      if (log.date) {
        months.add(log.date.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(months).sort().reverse();
  }, [logs]);

  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);

  // Filtering logic
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const roomName = roomMap.get(log.roomId) || '';
      const execName = log.executorName || '';
      const details = log.actionDetails || '';
      const brand = log.deviceBrand || '';

      const matchesSearch =
        roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        execName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRoom = selectedRoomId === 'all' || log.roomId === selectedRoomId;
      const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
      const matchesMonth = selectedMonth === 'all' || log.date.startsWith(selectedMonth);

      return matchesSearch && matchesRoom && matchesCategory && matchesMonth;
    });
  }, [logs, searchQuery, selectedRoomId, selectedCategory, selectedMonth, roomMap]);

  const handleStartEdit = (log: MaintenanceLog) => {
    setEditingLogId(log.id);
    setEditDetails(log.actionDetails || '');
    setEditCategory(log.category);
    setEditExecutor(log.executorName || '');
    setEditDate(log.date);
    setEditBrand(log.deviceBrand || '');
    setEditCount(log.devicesCount ? log.devicesCount.toString() : '');
  };

  const handleSaveEdit = (logId: string) => {
    const parsedCount = editCount ? parseInt(editCount, 10) : undefined;
    updateLog(logId, {
      category: editCategory,
      actionDetails: editDetails.trim() || undefined,
      executorName: editExecutor.trim() || undefined,
      deviceBrand: editBrand.trim() || undefined,
      devicesCount: parsedCount,
      date: editDate,
    });
    setEditingLogId(null);
  };

  const handleDelete = (logId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      deleteLog(logId);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRoomId('all');
    setSelectedCategory('all');
    setSelectedMonth('all');
  };

  const getPeriodLabel = () => {
    if (selectedMonth !== 'all') {
      const [year, month] = selectedMonth.split('-');
      const monthNames: Record<string, string> = {
        '01': 'يناير',
        '02': 'فبراير',
        '03': 'مارس',
        '04': 'أبريل',
        '05': 'مايو',
        '06': 'يونيو',
        '07': 'يوليو',
        '08': 'أغسطس',
        '09': 'سبتمبر',
        '10': 'أكتوبر',
        '11': 'نوفمبر',
        '12': 'ديسمبر',
      };
      return `تقرير شهر: ${monthNames[month] || month} ${year}`;
    }
    return 'التقرير الشامل لكافة الفترات';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner & Main Actions */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-blue-600" />
            <span>سجل العمليات الشامل والتقارير</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            جدول البيانات الفنية مع الفلترة حسب الشهر والقاعة ونوع العملية وتصدير Excel وطباعة تقرير الإدارة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => exportLogsToExcel(filteredLogs, 'تقرير_العمليات_الفنية_المفلتر')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all active:scale-95"
            title="تحميل البيانات المعروضة في ملف Excel"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>تصدير إلى Excel ({filteredLogs.length})</span>
          </button>

          <button
            onClick={() => onOpenPrintModalWithLogs(filteredLogs, getPeriodLabel())}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all active:scale-95"
            title="تنسيق وطباعة تقرير رسمي للإدارة"
          >
            <Printer className="w-5 h-5" />
            <span>طباعة تقرير الإدارة</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>تصفية وفلترة السجلات الفنية</span>
          </div>

          {(searchQuery || selectedRoomId !== 'all' || selectedCategory !== 'all' || selectedMonth !== 'all') && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة تعيين الفلاتر</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالقاعة أو المنفذ أو الماركة..."
              className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Month Filter */}
          <div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="all">كافة الأشهر والسنوات</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  شهر {m}
                </option>
              ))}
            </select>
          </div>

          {/* Room Filter */}
          <div>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="all">جميع القاعات والمعامل ({rooms.length})</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="all">جميع أنواع العمليات</option>
              <option value="صيانة عامة">صيانة عامة</option>
              <option value="استبدال">استبدال</option>
              <option value="ترقية رام">ترقية رام</option>
              <option value="شاشات">شاشات</option>
            </select>
          </div>

        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            النتائج المعروضة: <strong className="text-blue-700">{filteredLogs.length}</strong> عملية من إجمالي{' '}
            <strong>{logs.length}</strong>
          </span>
          <span className="text-[11px] text-slate-400">
            {selectedMonth !== 'all' ? `الفترة المحددة: شهر ${selectedMonth}` : 'جميع الفترات مسجلة'}
          </span>
        </div>
      </div>

      {/* Comprehensive Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">لا توجد عمليات تطابق معايير التصفية</h3>
            <p className="text-xs text-slate-400 mt-1">جرّب إلغاء بعض الفلاتر لعرض البيانات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 w-28">تاريخ الإجراء</th>
                  <th className="py-3.5 px-4 w-40">القاعة</th>
                  <th className="py-3.5 px-4 w-32">نوع العملية</th>
                  <th className="py-3.5 px-4 w-40">التصنيف / الماركة / العدد</th>
                  <th className="py-3.5 px-4">تفاصيل العمل الفني المنجز</th>
                  <th className="py-3.5 px-4 w-32">اسم المنفذ</th>
                  <th className="py-3.5 px-4 text-center w-24">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log, index) => {
                  const roomName = roomMap.get(log.roomId) || 'غير محدد';
                  const isEditing = editingLogId === log.id;

                  let subAndCount = '-';
                  if (log.category === 'صيانة عامة' && log.generalSubType) {
                    subAndCount = `${log.generalSubType} ${log.devicesCount ? `(${log.devicesCount} جهاز)` : ''}`;
                  } else if (log.category === 'استبدال' && log.replacementSubType) {
                    subAndCount = `${log.replacementSubType} ${log.devicesCount ? `(${log.devicesCount} جهاز)` : log.itemsCount ? `(${log.itemsCount} قطعة)` : ''}`;
                  } else if (log.category === 'ترقية رام') {
                    subAndCount = log.devicesCount ? `ترقية ${log.devicesCount} جهاز` : 'ترقية رام';
                  }

                  let specs = log.deviceBrand || '';
                  if (log.category === 'استبدال' && log.oldDevice && log.newDevice) {
                    specs = `${log.oldDevice.nameOrBrand || ''} ⬅ ${log.newDevice.nameOrBrand || ''}`;
                  } else if (log.category === 'ترقية رام' && (log.previousRam || log.newRam)) {
                    specs = `${log.previousRam || ''} ⬅ ${log.newRam || ''}`;
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">
                        {index + 1}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="p-1 rounded border border-slate-300 bg-white text-xs"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{log.date}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedRoomIdForModal(log.roomId)}
                          className="hover:text-blue-600 flex items-center gap-1.5 transition-colors text-right"
                          title="فتح ملف هذه القاعة"
                        >
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{roomName}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as OperationCategory)}
                            className="text-xs p-1 rounded border border-slate-300 bg-white font-semibold"
                          >
                            <option value="صيانة عامة">صيانة عامة</option>
                            <option value="استبدال">استبدال</option>
                            <option value="ترقية رام">ترقية رام</option>
                            <option value="شاشات">شاشات</option>
                          </select>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                            {log.category}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-700 text-xs">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editBrand}
                              onChange={(e) => setEditBrand(e.target.value)}
                              placeholder="الماركة"
                              className="p-1 rounded border border-slate-300 bg-white text-xs w-20"
                            />
                            <input
                              type="number"
                              value={editCount}
                              onChange={(e) => setEditCount(e.target.value)}
                              placeholder="العدد"
                              className="p-1 rounded border border-slate-300 bg-white text-xs w-14"
                            />
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold">{subAndCount}</span>
                            {specs && <span className="block text-slate-500 text-[11px]">{specs}</span>}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-700 max-w-sm">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDetails}
                            onChange={(e) => setEditDetails(e.target.value)}
                            className="w-full text-xs p-1.5 border border-blue-400 rounded-lg outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className="text-xs leading-relaxed">{log.actionDetails || '-'}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-xs whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editExecutor}
                            onChange={(e) => setEditExecutor(e.target.value)}
                            placeholder="اسم المنفذ"
                            className="p-1 rounded border border-slate-300 bg-white text-xs w-28"
                          />
                        ) : log.executorName ? (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{log.executorName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(log.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                title="حفظ التعديل"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingLogId(null)}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
                                title="إلغاء"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(log)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="تعديل هذه العملية"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(log.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="حذف هذه العملية"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
