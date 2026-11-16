'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { OperationCategory, MaintenanceLog } from '../types';
import type { PrintReportFilters } from './PrintReportModal';
import { aggregateReportData, buildCountUpdateFields, getLogSubAndSpecs } from '../utils/reportAggregator';
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
  Wrench,
  Cpu,
  HardDrive,
  Zap,
  Monitor,
  ClipboardList,
  Layers,
  FolderOpen,
  ExternalLink,
} from 'lucide-react';

export const ReportsView: React.FC<{
  onOpenPrintModalWithLogs: (
    logs: MaintenanceLog[],
    periodLabel: string,
    filters?: PrintReportFilters
  ) => void;
}> = ({ onOpenPrintModalWithLogs }) => {
  const {
    buildings,
    rooms,
    logs,
    visits,
    deleteLog,
    updateLog,
    deleteVisit,
    exportLogsToExcel,
    setSelectedRoomIdForModal,
    desktopStorageInfo,
    lastSavedReport,
    openLocalFolder,
    openLocalFile,
  } = useApp();

  const [reportTab, setReportTab] = useState<'summary' | 'logs' | 'visits'>('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuildingIdFilter, setSelectedBuildingIdFilter] = useState<string>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Inline editing state
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editDetails, setEditDetails] = useState<string>('');
  const [editCategory, setEditCategory] = useState<OperationCategory>('صيانة عامة');
  const [editExecutor, setEditExecutor] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editBrand, setEditBrand] = useState<string>('');
  const [editCount, setEditCount] = useState<string>('');

  // Extract unique months from both logs and visits
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    logs.forEach((log) => {
      if (log.date) months.add(log.date.substring(0, 7));
    });
    visits.forEach((v) => {
      if (v.date) months.add(v.date.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  }, [logs, visits]);

  const roomObjMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);

  // Combine Month selector and Date range into a unified effective range
  const effectiveDateFrom = useMemo(() => {
    if (dateFrom) return dateFrom;
    if (selectedMonth !== 'all') return `${selectedMonth}-01`;
    return '';
  }, [dateFrom, selectedMonth]);

  const effectiveDateTo = useMemo(() => {
    if (dateTo) return dateTo;
    if (selectedMonth !== 'all') return `${selectedMonth}-31`;
    return '';
  }, [dateTo, selectedMonth]);

  // Filtering logic for MaintenanceLogs
  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return logs.filter((log) => {
      const room = roomObjMap.get(log.roomId);
      const roomName = room?.name || '';
      const bldgName = room?.buildingId ? buildingMap.get(room.buildingId) || '' : '';
      const execName = log.executorName || '';
      const details = log.actionDetails || '';
      const brand = log.deviceBrand || '';

      const matchesSearch =
        !q ||
        roomName.toLowerCase().includes(q) ||
        bldgName.toLowerCase().includes(q) ||
        details.toLowerCase().includes(q) ||
        execName.toLowerCase().includes(q) ||
        brand.toLowerCase().includes(q) ||
        log.category.toLowerCase().includes(q);

      const matchesBuilding = selectedBuildingIdFilter === 'all' || room?.buildingId === selectedBuildingIdFilter;
      const matchesRoom = selectedRoomId === 'all' || log.roomId === selectedRoomId;
      const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
      const matchesDateFrom = !effectiveDateFrom || (log.date || '') >= effectiveDateFrom;
      const matchesDateTo = !effectiveDateTo || (log.date || '') <= effectiveDateTo;

      return matchesSearch && matchesBuilding && matchesRoom && matchesCategory && matchesDateFrom && matchesDateTo;
    });
  }, [
    logs,
    searchQuery,
    selectedBuildingIdFilter,
    selectedRoomId,
    selectedCategory,
    effectiveDateFrom,
    effectiveDateTo,
    roomObjMap,
    buildingMap,
  ]);

  const activeAggregatorFilters: PrintReportFilters = useMemo(
    () => ({
      buildingId: selectedBuildingIdFilter,
      roomId: selectedRoomId,
      dateFrom: effectiveDateFrom || undefined,
      dateTo: effectiveDateTo || undefined,
      includeExplicitVisits: selectedCategory === 'all' && !searchQuery.trim(),
    }),
    [selectedBuildingIdFilter, selectedRoomId, effectiveDateFrom, effectiveDateTo, selectedCategory, searchQuery]
  );

  // Unified Aggregated Outputs & Visits for current filters
  const filteredReport = useMemo(() => {
    return aggregateReportData({
      buildings,
      rooms,
      logs: filteredLogs,
      visits,
      filters: activeAggregatorFilters,
    });
  }, [buildings, rooms, filteredLogs, visits, activeAggregatorFilters]);

  const handleStartEdit = (log: MaintenanceLog) => {
    setEditingLogId(log.id);
    setEditDetails(log.actionDetails || '');
    setEditCategory(log.category);
    setEditExecutor(log.executorName || '');
    setEditDate(log.date);
    setEditBrand(log.deviceBrand || '');
    setEditCount(log.devicesCount ? log.devicesCount.toString() : log.itemsCount ? log.itemsCount.toString() : '');
  };

  const handleSaveEdit = (logId: string) => {
    const parsedCount = editCount ? parseInt(editCount, 10) : undefined;
    const existingLog = logs.find((l) => l.id === logId);
    const countFields = buildCountUpdateFields(existingLog, editCategory, parsedCount);
    updateLog(logId, {
      category: editCategory,
      actionDetails: editDetails.trim() || undefined,
      executorName: editExecutor.trim() || undefined,
      deviceBrand: editBrand.trim() || undefined,
      ...countFields,
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
    setSelectedBuildingIdFilter('all');
    setSelectedRoomId('all');
    setSelectedCategory('all');
    setSelectedMonth('all');
    setDateFrom('');
    setDateTo('');
  };

  const getPeriodLabel = () => {
    let baseLabel = 'التقرير الشامل لكافة الفترات';
    if (dateFrom || dateTo) {
      baseLabel = `تقرير الفترة من ${dateFrom || 'البداية'} إلى ${dateTo || 'اليوم'}`;
    } else if (selectedMonth !== 'all') {
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
      baseLabel = `تقرير شهر: ${monthNames[month] || month} ${year}`;
    }

    if (selectedBuildingIdFilter !== 'all') {
      const bldg = buildings.find((b) => b.id === selectedBuildingIdFilter);
      if (bldg) baseLabel += ` - ${bldg.name}`;
    }
    if (selectedRoomId !== 'all') {
      const rm = rooms.find((r) => r.id === selectedRoomId);
      if (rm) baseLabel += ` (${rm.name})`;
    }
    if (selectedCategory !== 'all') {
      baseLabel += ` • تصنيف: ${selectedCategory}`;
    }
    return baseLabel;
  };

  // Rooms available in filter (if building selected, only its rooms)
  const availableFilterRooms = useMemo(() => {
    if (selectedBuildingIdFilter === 'all') return rooms;
    return rooms.filter((r) => r.buildingId === selectedBuildingIdFilter);
  }, [rooms, selectedBuildingIdFilter]);

  const hasActiveFilters = Boolean(
    searchQuery ||
      selectedBuildingIdFilter !== 'all' ||
      selectedRoomId !== 'all' ||
      selectedCategory !== 'all' ||
      selectedMonth !== 'all' ||
      dateFrom ||
      dateTo
  );

  const { outputs, assets, byBuilding, byRoom, effectiveVisits } = filteredReport;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner & Main Actions */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <span>مركز التقارير الشامل والمخرجات والزيارات</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            تجميع كامل لمخرجات الصيانة والترقيات والشاشات وزيارات المباني والقاعات مع التصدير والطباعة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() =>
              exportLogsToExcel(filteredLogs, 'تقرير_المخرجات_الشامل', {
                periodLabel: getPeriodLabel(),
                filters: activeAggregatorFilters,
              })
            }
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all active:scale-95"
            title="تحميل تقرير شامل متعدد الأوراق (ملخص، مبانٍ، قاعات، زيارات، عمليات)"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>تصدير Excel شامل ({filteredLogs.length})</span>
          </button>

          <button
            onClick={() => onOpenPrintModalWithLogs(filteredLogs, getPeriodLabel(), activeAggregatorFilters)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all active:scale-95"
            title="معاينة وطباعة التقرير الشامل للإدارة (PDF)"
          >
            <Printer className="w-5 h-5" />
            <span>طباعة التقرير الشامل</span>
          </button>
        </div>
      </div>

      {/* Local Desktop Storage & Reports Banner */}
      {desktopStorageInfo && (
        <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/70 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5 text-xs">
            <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>الحفظ والتقارير محلية على جهازك ({desktopStorageInfo.mode === 'portable' ? 'وضع محمول بجانب البرنامج' : 'مجلد المستندات المحلي'})</span>
            </div>
            <p className="text-emerald-700 dark:text-emerald-300/90 font-mono text-[11px] break-all" dir="ltr">
              {desktopStorageInfo.reportsDir}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {lastSavedReport && (
              <button
                onClick={() => openLocalFile(lastSavedReport.filePath)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                title={lastSavedReport.filePath}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح آخر ملف: {lastSavedReport.fileName}</span>
              </button>
            )}
            <button
              onClick={() => openLocalFolder('reports')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-emerald-100 dark:hover:bg-slate-800 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs font-bold transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>فتح مجلد التقارير</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>تصفية التقارير والفترة الزمنية والموقع</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة تعيين الفلاتر</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالقاعة، المبنى، المواصفات، أو المنفذ..."
              className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Month Filter */}
          <div>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                if (e.target.value !== 'all') {
                  setDateFrom('');
                  setDateTo('');
                }
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800"
            >
              <option value="all">كافة الأشهر والسنوات</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  شهر {m}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                if (e.target.value) setSelectedMonth('all');
              }}
              title="من تاريخ"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
            />
          </div>

          {/* Date To */}
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                if (e.target.value) setSelectedMonth('all');
              }}
              title="إلى تاريخ"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
            />
          </div>

          {/* Building Filter */}
          <div>
            <select
              value={selectedBuildingIdFilter}
              onChange={(e) => {
                setSelectedBuildingIdFilter(e.target.value);
                setSelectedRoomId('all');
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800"
            >
              <option value="all">كافة المباني ({buildings.length})</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  🏢 {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room Filter */}
          <div>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800"
            >
              <option value="all">
                {selectedBuildingIdFilter === 'all'
                  ? `جميع القاعات (${rooms.length})`
                  : `قاعات المبنى (${availableFilterRooms.length})`}
              </option>
              {availableFilterRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category row + Filter summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تصفية نوع العملية:</span>
            {['all', 'صيانة عامة', 'ترقية رام', 'تبديل هاردسك', 'تبديل باور سبلاي', 'شاشات', 'استبدال'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {cat === 'all' ? 'الكل' : cat}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            النطاق: <strong className="text-blue-700 dark:text-blue-400">{getPeriodLabel()}</strong>
          </span>
        </div>
      </div>

      {/* Live Executive Outputs Summary Strip for Current Filter Scope */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          {
            label: 'صيانة أجهزة',
            value: outputs.devicesMaintained,
            sub: `تحديث: ${outputs.devicesUpdated}`,
            icon: <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
            cls: 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/70 dark:border-blue-900/60',
          },
          {
            label: 'ترقية رام',
            value: outputs.devicesUpgraded,
            sub: 'جهاز مرقى',
            icon: <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
            cls: 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200/70 dark:border-indigo-900/60',
          },
          {
            label: 'تبديل هاردسك',
            value: outputs.hardDrivesReplaced,
            sub: 'SSD / HDD',
            icon: <HardDrive className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />,
            cls: 'bg-cyan-50/70 dark:bg-cyan-950/30 border-cyan-200/70 dark:border-cyan-900/60',
          },
          {
            label: 'باور سبلاي',
            value: outputs.powerSuppliesReplaced,
            sub: 'وحدة مبدلة',
            icon: <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
            cls: 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-900/60',
          },
          {
            label: 'شاشات مبدلة',
            value: outputs.screensReplaced,
            sub: `صيانة: ${outputs.screensMaintained}`,
            icon: <Monitor className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
            cls: 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200/70 dark:border-purple-900/60',
          },
          {
            label: 'أجهزة وملحقات',
            value: outputs.devicesReplaced + outputs.itemsReplaced,
            sub: `جهاز ${outputs.devicesReplaced} • قطعة ${outputs.itemsReplaced}`,
            icon: <Layers className="w-4 h-4 text-slate-600 dark:text-slate-300" />,
            cls: 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700',
          },
          {
            label: 'زيارات القاعات',
            value: filteredReport.totalRoomVisits,
            sub: `أيام المباني: ${filteredReport.totalBuildingVisitDays}`,
            icon: <ClipboardList className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
            cls: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-900/60',
          },
          {
            label: 'جاهزية الأجهزة',
            value: `${assets.readinessPercent}%`,
            sub: `${assets.devicesReadyCount} / ${assets.totalInstalledDevices}`,
            icon: <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
            cls: 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-200/70 dark:border-teal-900/60',
          },
        ].map((card) => (
          <div key={card.label} className={`p-3.5 rounded-2xl border ${card.cls}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{card.label}</span>
              {card.icon}
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{card.value}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Reports View Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 w-fit">
        {[
          { id: 'summary' as const, label: 'ملخص المباني والقاعات والزيارات', count: byRoom.length },
          { id: 'logs' as const, label: 'سجل العمليات التفصيلي', count: filteredLogs.length },
          { id: 'visits' as const, label: 'سجل الزيارات الميدانية', count: effectiveVisits.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setReportTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              reportTab === t.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{t.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                reportTab === t.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* TAB 1: Per-Building & Per-Room Summary Matrix */}
      {reportTab === 'summary' && (
        <div className="space-y-6">
          {/* Buildings Matrix */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>مخرجات وزيارات المباني ({byBuilding.length} مبنى)</span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  توضح "أيام زيارة المبنى" الأيام الفريدة لتواجد الفني بالمبنى، و"زيارات القاعات" مجموع زيارات كل قاعة بداخله.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <th className="py-3 px-4">المبنى</th>
                    <th className="py-3 px-3 text-center">القاعات</th>
                    <th className="py-3 px-3 text-center">الأجهزة / الجاهزية</th>
                    <th className="py-3 px-3 text-center">أيام زيارة المبنى</th>
                    <th className="py-3 px-3 text-center">زيارات القاعات</th>
                    <th className="py-3 px-3 text-center">آخر زيارة</th>
                    <th className="py-3 px-2.5 text-center">العمليات</th>
                    <th className="py-3 px-2.5 text-center">صيانة</th>
                    <th className="py-3 px-2.5 text-center">تحديث</th>
                    <th className="py-3 px-2.5 text-center">رام</th>
                    <th className="py-3 px-2.5 text-center">هاردسك</th>
                    <th className="py-3 px-2.5 text-center">باور</th>
                    <th className="py-3 px-2.5 text-center">شاشات</th>
                    <th className="py-3 px-2.5 text-center">مستبدل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {byBuilding.map((b) => (
                    <tr key={b.building.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white">{b.building.name}</td>
                      <td className="py-3 px-3 text-center font-bold">{b.roomsCount}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold">{b.assets.devicesReadyCount}/{b.assets.totalInstalledDevices}</span>
                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          {b.assets.readinessPercent}% جاهز
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black">
                          {b.visitDaysCount} يوم
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-black text-blue-700 dark:text-blue-400">
                        {b.roomVisitsTotal}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500 whitespace-nowrap">{b.lastVisitDate || '-'}</td>
                      <td className="py-3 px-2.5 text-center font-bold">{b.outputs.totalOperations}</td>
                      <td className="py-3 px-2.5 text-center">{b.outputs.devicesMaintained}</td>
                      <td className="py-3 px-2.5 text-center">{b.outputs.devicesUpdated}</td>
                      <td className="py-3 px-2.5 text-center">{b.outputs.devicesUpgraded}</td>
                      <td className="py-3 px-2.5 text-center">{b.outputs.hardDrivesReplaced}</td>
                      <td className="py-3 px-2.5 text-center">{b.outputs.powerSuppliesReplaced}</td>
                      <td className="py-3 px-2.5 text-center font-bold text-purple-700 dark:text-purple-400">
                        {b.outputs.screensReplaced}
                      </td>
                      <td className="py-3 px-2.5 text-center">{b.outputs.devicesReplaced + b.outputs.itemsReplaced}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rooms Matrix */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>تفصيل القاعات وعدد الزيارات لكل قاعة ({byRoom.length} قاعة)</span>
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <th className="py-3 px-4">المبنى</th>
                    <th className="py-3 px-4">القاعة</th>
                    <th className="py-3 px-3 text-center">الشاشة الرئيسية</th>
                    <th className="py-3 px-3 text-center">الأجهزة (جاهز/كلي)</th>
                    <th className="py-3 px-3 text-center">عدد الزيارات</th>
                    <th className="py-3 px-3 text-center">آخر زيارة</th>
                    <th className="py-3 px-2.5 text-center">صيانة</th>
                    <th className="py-3 px-2.5 text-center">تحديث</th>
                    <th className="py-3 px-2.5 text-center">رام</th>
                    <th className="py-3 px-2.5 text-center">هاردسك</th>
                    <th className="py-3 px-2.5 text-center">باور</th>
                    <th className="py-3 px-2.5 text-center">شاشات</th>
                    <th className="py-3 px-2.5 text-center">ملحقات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {byRoom.map((r) => (
                    <tr key={r.room.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">{r.buildingName}</td>
                      <td className="py-3 px-4 font-bold">
                        <button
                          onClick={() => setSelectedRoomIdForModal(r.room.id)}
                          className="text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-right"
                        >
                          {r.room.name}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center text-[11px]">{r.room.screenStatus}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {r.assets.devicesReadyCount} / {r.assets.totalInstalledDevices}
                        </span>
                        {r.assets.devicesNeedMaintenanceCount > 0 && (
                          <span className="block text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                            {r.assets.devicesNeedMaintenanceCount} يحتاج صيانة
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black">
                          {r.visitsCount}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500 whitespace-nowrap">{r.lastVisitDate || '-'}</td>
                      <td className="py-3 px-2.5 text-center">{r.outputs.devicesMaintained}</td>
                      <td className="py-3 px-2.5 text-center">{r.outputs.devicesUpdated}</td>
                      <td className="py-3 px-2.5 text-center">{r.outputs.devicesUpgraded}</td>
                      <td className="py-3 px-2.5 text-center">{r.outputs.hardDrivesReplaced}</td>
                      <td className="py-3 px-2.5 text-center">{r.outputs.powerSuppliesReplaced}</td>
                      <td className="py-3 px-2.5 text-center font-bold text-purple-700 dark:text-purple-400">
                        {r.outputs.screensReplaced}
                      </td>
                      <td className="py-3 px-2.5 text-center">{r.outputs.itemsReplaced}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Comprehensive Operations Table */}
      {reportTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">لا توجد عمليات تطابق معايير التصفية</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">جرّب إلغاء بعض الفلاتر لعرض البيانات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4 w-28">تاريخ الإجراء</th>
                    <th className="py-3.5 px-4 w-36">المبنى</th>
                    <th className="py-3.5 px-4 w-40">القاعة</th>
                    <th className="py-3.5 px-4 w-32">نوع العملية</th>
                    <th className="py-3.5 px-4 w-44">التصنيف / الماركة / العدد</th>
                    <th className="py-3.5 px-4">تفاصيل العمل الفني المنجز</th>
                    <th className="py-3.5 px-4 w-32">اسم المنفذ</th>
                    <th className="py-3.5 px-4 text-center w-24">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.map((log, index) => {
                    const room = roomObjMap.get(log.roomId);
                    const roomName = room?.name || 'غير محدد';
                    const bldgName = room?.buildingId ? buildingMap.get(room.buildingId) || '-' : '-';
                    const isEditing = editingLogId === log.id;
                    const { subAndCount, specs } = getLogSubAndSpecs(log);

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 dark:text-slate-500 font-mono text-xs">
                          {index + 1}
                        </td>

                        <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs"
                            />
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{log.date}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">
                          {bldgName}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedRoomIdForModal(log.roomId)}
                            className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors text-right"
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
                              className="text-xs p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-semibold"
                            >
                              <option value="صيانة عامة">صيانة عامة</option>
                              <option value="ترقية رام">ترقية رام</option>
                              <option value="تبديل هاردسك">تبديل هاردسك</option>
                              <option value="تبديل باور سبلاي">تبديل باور سبلاي</option>
                              <option value="شاشات">شاشات</option>
                              <option value="استبدال">استبدال</option>
                            </select>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                              {log.category}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 text-xs">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editBrand}
                                onChange={(e) => setEditBrand(e.target.value)}
                                placeholder="الماركة"
                                className="p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs w-20"
                              />
                              <input
                                type="number"
                                value={editCount}
                                onChange={(e) => setEditCount(e.target.value)}
                                placeholder="العدد"
                                className="p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs w-14"
                              />
                            </div>
                          ) : (
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{subAndCount}</span>
                              {specs && <span className="block text-slate-500 dark:text-slate-400 text-[11px]">{specs}</span>}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-sm">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDetails}
                              onChange={(e) => setEditDetails(e.target.value)}
                              className="w-full text-xs p-1.5 border border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg outline-none"
                              autoFocus
                            />
                          ) : (
                            <span className="text-xs leading-relaxed">{log.actionDetails || '-'}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editExecutor}
                              onChange={(e) => setEditExecutor(e.target.value)}
                              placeholder="اسم المنفذ"
                              className="p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs w-28"
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
                                  className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                                  title="حفظ التعديل"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingLogId(null)}
                                  className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                  title="إلغاء"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEdit(log)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                  title="تعديل هذه العملية"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(log.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                  title="حذف هذه العملية"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* TAB 3: Deduplicated Field Visits Timeline */}
      {reportTab === 'visits' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          {effectiveVisits.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">لا توجد زيارات مسجلة ضمن الفلتر الحالي</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                يتم احتساب الزيارات تلقائياً من تواريخ العمليات أو عبر زر "زيارة اليوم" من صفحة القاعات
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4 w-28">تاريخ الزيارة</th>
                    <th className="py-3.5 px-4 w-36">المبنى</th>
                    <th className="py-3.5 px-4 w-40">القاعة</th>
                    <th className="py-3.5 px-4 w-36">مصدر الزيارة</th>
                    <th className="py-3.5 px-4 w-28">الغرض</th>
                    <th className="py-3.5 px-3 text-center w-24">العمليات</th>
                    <th className="py-3.5 px-4 w-32">المنفذ / الزائر</th>
                    <th className="py-3.5 px-4">ملخص الزيارة والأعمال</th>
                    <th className="py-3.5 px-4 text-center w-16">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {effectiveVisits.map((ev, index) => (
                    <tr key={ev.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono">{index + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{ev.date}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{ev.buildingName}</td>
                      <td className="py-3 px-4 font-bold">
                        <button
                          onClick={() => setSelectedRoomIdForModal(ev.roomId)}
                          className="text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {ev.roomName}
                        </button>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            ev.source === 'جولة تفقدية'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : ev.source === 'مشترك (صيانة + تفقد)'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {ev.source}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{ev.purpose}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-white">{ev.operationsCount}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{ev.executors.join('، ') || '-'}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-sm leading-relaxed">{ev.notes}</td>
                      <td className="py-3 px-4 text-center">
                        {ev.explicitVisitIds.length > 0 ? (
                          <button
                            onClick={() =>
                              ev.explicitVisitIds.forEach((vId, idx) =>
                                deleteVisit(vId, { silent: idx > 0 })
                              )
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                            title="حذف سجل الزيارة التفقدية اليدوية"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">تلقائي</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
