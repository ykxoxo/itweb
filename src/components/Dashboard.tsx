'use client';

import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Cpu,
  Wrench,
  Building2,
  PlusCircle,
  FileText,
  FileSpreadsheet,
  Calendar,
  User,
  ArrowUpRight,
  Sparkles,
  ClipboardCheck,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  'صيانة عامة': '#3b82f6', // Blue
  'استبدال': '#8b5cf6',    // Purple
  'ترقية رام': '#6366f1',  // Indigo
  'شاشات': '#10b981',      // Emerald
};

export const Dashboard: React.FC<{ onOpenPrintModal: () => void }> = ({ onOpenPrintModal }) => {
  const { rooms, logs, stats, setActiveTab, setSelectedRoomIdForModal, exportLogsToExcel, darkMode } = useApp();

  // 1. Action Category Distribution (Pie Chart Data)
  const pieData = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    for (let i = 0; i < logs.length; i++) {
      const cat = logs[i].category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
    return Object.keys(categoryCounts).map((cat) => ({
      name: cat,
      value: categoryCounts[cat],
      color: CATEGORY_COLORS[cat] || '#64748b',
    }));
  }, [logs]);

  // 2. Top Active Rooms (Bar Chart Data)
  const barData = useMemo(() => {
    const roomLogsCount: Record<string, number> = {};
    for (let i = 0; i < logs.length; i++) {
      const rId = logs[i].roomId;
      roomLogsCount[rId] = (roomLogsCount[rId] || 0) + 1;
    }
    return rooms
      .map((room) => ({
        name: room.name.length > 18 ? room.name.substring(0, 16) + '...' : room.name,
        fullName: room.name,
        count: roomLogsCount[room.id] || 0,
        id: room.id,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [logs, rooms]);

  // Recent 6 logs
  const recentLogs = useMemo(() => [...logs].reverse().slice(0, 6), [logs]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>لوحة التحكم الفنية والإحصائية</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              نظام إدارة أصول التقنية وصيانة القاعات
            </h1>
            <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed">
              إحصائيات مباشرة ودقيقة لعدد الأجهزة التي تمت صيانتها، ترقيتها، وتحديثها، وجاهزية التقارير بضغطة زر.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('add-log')}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-blue-900 hover:bg-blue-50 font-bold text-sm shadow-md transition-all active:scale-95"
            >
              <PlusCircle className="w-5 h-5 text-blue-600" />
              <span>إضافة عملية جديدة</span>
            </button>
            <button
              onClick={onOpenPrintModal}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-sm border border-white/20 shadow-md transition-all active:scale-95"
            >
              <FileText className="w-5 h-5" />
              <span>طباعة تقرير الإدارة</span>
            </button>
            <button
              onClick={() => exportLogsToExcel()}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all active:scale-95"
              title="تصدير كامل البيانات لإكسل"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span className="hidden sm:inline">تصدير Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* KPI 1: Devices Maintained */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">أجهزة تم صيانتها بشكل عام</span>
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-700 dark:text-blue-400">{stats.devicesMaintained}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">جهاز تمت صيانته</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>صيانة دورية للأجهزة</span>
            <span className="font-bold text-blue-700 dark:text-blue-400">منجز</span>
          </div>
        </div>

        {/* KPI 2: Devices Upgraded (RAM) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">أجهزة تمت ترقيتها (رام)</span>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-400">{stats.devicesUpgraded}</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
              جهاز مرقى
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>ترقية رامات الذاكرة</span>
            <span className="font-bold text-indigo-700 dark:text-indigo-400">نشط</span>
          </div>
        </div>

        {/* KPI 3: Devices Updated */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">أجهزة تم تحديثها</span>
            <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-teal-700 dark:text-teal-400">{stats.devicesUpdated}</span>
            <span className="text-xs text-teal-600 dark:text-teal-300 font-semibold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md">
              جهاز محدث
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>تحديث أنظمة وتعريفات</span>
            <span className="font-bold text-teal-700 dark:text-teal-400">جاهز</span>
          </div>
        </div>

        {/* KPI 4: Replaced Devices & Items */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">عمليات الاستبدال</span>
            <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-700 dark:text-purple-400">{stats.devicesReplaced}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">جهاز + {stats.itemsReplaced} ملحقات</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>شاشات / ماوسات / كيبوردات</span>
            <span className="font-bold text-purple-700 dark:text-purple-400">{stats.screensCount} شاشة</span>
          </div>
        </div>

      </div>

      {/* Secondary Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">إجمالي سجل العمليات المنفذة</span>
              <span className="text-lg font-black text-slate-800 dark:text-white">{stats.totalOperations} عملية مسجلة</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('reports')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            عرض السجل الشامل
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">إجمالي القاعات والمعامل</span>
              <span className="text-lg font-black text-slate-800 dark:text-white">{stats.totalRooms} قاعة مسجلة</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('rooms')}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
          >
            إدارة القاعات
          </button>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Action Category Distribution (Pie Chart) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">توزيع العمليات الفنية</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">نسبة كل نوع عملية من إجمالي العمليات</p>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} عملية`, name]}
                    contentStyle={{
                      backgroundColor: darkMode ? '#0f172a' : '#1e293b',
                      borderRadius: '12px',
                      color: '#ffffff',
                      direction: 'rtl',
                      border: 'none',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">لا توجد عمليات مسجلة بعد</p>
            )}
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 dark:text-slate-300 truncate">{item.name}:</span>
                <span className="font-bold text-slate-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Most Active Rooms (Bar Chart) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">أكثر القاعات نشاطاً في العمليات</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">عدد الإجراءات والأعمال المنجزة داخل كل قاعة</p>
            </div>
            <button
              onClick={() => setActiveTab('rooms')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
            >
              <span>عرض كل القاعات</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-64 w-full">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#f1f5f9'} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 11 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: any) => [`${value} عملية`, 'الإجمالي']}
                    labelFormatter={(label) => `القاعة: ${label}`}
                    contentStyle={{
                      backgroundColor: darkMode ? '#0f172a' : '#1e293b',
                      borderRadius: '12px',
                      color: '#ffffff',
                      direction: 'rtl',
                      border: 'none',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                لا توجد بيانات قاعات
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>اضغط على أي قاعة لعرض ملفها وسجل عملياتها وملاحظاتها المؤرخة</span>
            <span className="font-semibold text-blue-700 dark:text-blue-400">تحديث فوري</span>
          </div>
        </div>

      </div>

      {/* Recent Activity Table Preview */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">آخر العمليات المنفذة</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">سجل لحظي لآخر الأعمال والترقيات المسجلة بالقاعات</p>
          </div>
          <button
            onClick={() => setActiveTab('reports')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
          >
            <span>عرض السجل الشامل ({logs.length})</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold bg-slate-50/50 dark:bg-slate-800/50">
                <th className="py-3 px-4">القاعة</th>
                <th className="py-3 px-4">نوع العملية</th>
                <th className="py-3 px-4">التصنيف والعدد</th>
                <th className="py-3 px-4">الماركة / المواصفات</th>
                <th className="py-3 px-4">تفاصيل العمل</th>
                <th className="py-3 px-4">اسم المنفذ</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4 text-center">ملف القاعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentLogs.map((log) => {
                const roomName = roomMap.get(log.roomId) || 'غير محدد';
                const badgeColor = CATEGORY_COLORS[log.category] || '#3b82f6';

                let subAndCount = '-';
                if (log.category === 'صيانة عامة' && log.generalSubType) {
                  subAndCount = `${log.generalSubType} ${log.devicesCount ? `(${log.devicesCount} جهاز)` : ''}`;
                } else if (log.category === 'استبدال' && log.replacementSubType) {
                  subAndCount = `استبدال ${log.replacementSubType} ${log.devicesCount ? `(${log.devicesCount} جهاز)` : log.itemsCount ? `(${log.itemsCount} قطعة)` : ''}`;
                } else if (log.category === 'ترقية رام') {
                  subAndCount = log.devicesCount ? `ترقية ${log.devicesCount} جهاز` : 'ترقية رام';
                }

                let specs = log.deviceBrand || '';
                if (log.category === 'استبدال' && log.oldDevice && log.newDevice) {
                  specs = `${log.oldDevice.nameOrBrand || ''} ⬅ ${log.newDevice.nameOrBrand || ''}`;
                } else if (log.category === 'ترقية رام' && (log.previousRam || log.newRam)) {
                  specs = `${log.deviceBrand ? `${log.deviceBrand} ` : ''}(${log.previousRam || ''} ⬅ ${log.newRam || ''})`;
                }

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                      {roomName}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-xs"
                        style={{ backgroundColor: badgeColor }}
                      >
                        {log.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 text-xs">
                      {subAndCount}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-300 text-xs">
                      {specs || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate text-xs">
                      {log.actionDetails || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs whitespace-nowrap">
                      {log.executorName ? (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.executorName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.date}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedRoomIdForModal(log.roomId)}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs font-semibold"
                        title="فتح ملف القاعة"
                      >
                        عرض
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
