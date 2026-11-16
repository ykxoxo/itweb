'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenStatus, OperationCategory, MaintenanceLog, VisitPurpose } from '../types';
import { SCREEN_STATUS_CONFIG } from './RoomsList';
import { RoomNotesModal } from './RoomNotesModal';
import { InteractiveRoomMap } from './InteractiveRoomMap';
import { aggregateReportData, buildCountUpdateFields, getLogSubAndSpecs } from '../utils/reportAggregator';
import {
  Building2,
  X,
  Cpu,
  Wrench,
  PlusCircle,
  FileSpreadsheet,
  Trash2,
  Calendar,
  User,
  FileText,
  Edit2,
  Check,
  Sparkles,
  Monitor,
  Layers,
  HardDrive,
  Zap,
  Plus,
  ClipboardList,
} from 'lucide-react';

export const RoomModal: React.FC = () => {
  const {
    selectedRoomIdForModal,
    setSelectedRoomIdForModal,
    buildings,
    rooms,
    logs,
    visits,
    updateRoom,
    updateLog,
    deleteLog,
    addVisit,
    deleteVisit,
    setActiveTab,
    setPreselectedRoomIdForLog,
    exportLogsToExcel,
  } = useApp();

  const [activeModalTab, setActiveModalTab] = useState<'map' | 'logs' | 'visits'>('map');
  const [notesModalOpen, setNotesModalOpen] = useState(false);

  // Quick Visit form state
  const [visitDate, setVisitDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [visitPurpose, setVisitPurpose] = useState<VisitPurpose>('جولة تفقدية');
  const [visitorName, setVisitorName] = useState('');
  const [visitNotes, setVisitNotes] = useState('');

  // Operation inline editing state
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<OperationCategory>('صيانة عامة');
  const [editDetails, setEditDetails] = useState<string>('');
  const [editExecutor, setEditExecutor] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editBrand, setEditBrand] = useState<string>('');
  const [editCount, setEditCount] = useState<string>('');

  const room = useMemo(() => {
    return rooms.find((r) => r.id === selectedRoomIdForModal);
  }, [rooms, selectedRoomIdForModal]);

  const currentBuilding = useMemo(() => {
    if (!room?.buildingId) return null;
    return buildings.find((b) => b.id === room.buildingId) || null;
  }, [buildings, room]);

  // Memoize logs for this room only
  const roomLogs = useMemo(() => {
    if (!selectedRoomIdForModal) return [];
    return logs.filter((l) => l.roomId === selectedRoomIdForModal);
  }, [logs, selectedRoomIdForModal]);

  // Unified Room Statistics & Visits (via reportAggregator)
  const roomAggregated = useMemo(() => {
    if (!room) return null;
    return aggregateReportData({
      buildings,
      rooms: [room],
      logs,
      visits,
      filters: { roomId: room.id },
    });
  }, [buildings, room, logs, visits]);

  const roomVisitsCount = roomAggregated?.totalRoomVisits || 0;
  const roomLastVisitDate = roomAggregated?.byRoom[0]?.lastVisitDate || null;
  const roomOutputs = roomAggregated?.outputs;
  const roomEffectiveVisits = roomAggregated?.effectiveVisits || [];

  const handleRecordRoomVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    addVisit({
      roomId: room.id,
      date: visitDate || new Date().toISOString().split('T')[0],
      purpose: visitPurpose,
      visitorName: visitorName.trim() || undefined,
      notes: visitNotes.trim() || undefined,
    });
    setVisitNotes('');
  };

  const handleStatusChange = useCallback((newStatus: ScreenStatus) => {
    if (room) {
      updateRoom(room.id, { screenStatus: newStatus });
    }
  }, [room, updateRoom]);

  const handleAddNewOperation = useCallback(() => {
    if (room) {
      setPreselectedRoomIdForLog(room.id);
      setSelectedRoomIdForModal(null);
      setActiveTab('add-log');
    }
  }, [room, setPreselectedRoomIdForLog, setSelectedRoomIdForModal, setActiveTab]);

  const handleDeleteLog = useCallback((logId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      deleteLog(logId);
    }
  }, [deleteLog]);

  const handleStartEditLog = (log: MaintenanceLog) => {
    setEditingLogId(log.id);
    setEditCategory(log.category);
    setEditDetails(log.actionDetails || '');
    setEditExecutor(log.executorName || '');
    setEditDate(log.date);
    setEditBrand(log.deviceBrand || '');
    setEditCount(
      log.devicesCount ? log.devicesCount.toString() : log.itemsCount ? log.itemsCount.toString() : ''
    );
  };

  const handleSaveEditLog = (logId: string) => {
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

  if (!room || !selectedRoomIdForModal) return null;

  const notesCount = (room.roomNotes || []).length;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 overflow-y-auto no-print">
        <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full my-auto shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">{room.name}</h2>
                  {currentBuilding && (
                    <span className="text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 px-2.5 py-0.5 rounded-full font-bold">
                      {currentBuilding.name}
                    </span>
                  )}
                  <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-semibold">
                    ملف القاعة
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تاريخ التسجيل: {room.createdAt} • إجمالي العمليات: {roomLogs.length} • عدد الزيارات:{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400">{roomVisitsCount}</strong>
                  {roomLastVisitDate ? ` (آخر زيارة: ${roomLastVisitDate})` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedRoomIdForModal(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* View Switcher Tabs */}
          <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <button
              onClick={() => setActiveModalTab('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeModalTab === 'map'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>المخطط البصري للأجهزة</span>
              {room.devices && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    activeModalTab === 'map'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {room.devices.length + (room.instructorDevice ? 1 : 0)} جهاز
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveModalTab('logs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeModalTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>سجل العمليات والتقارير</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeModalTab === 'logs'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {roomLogs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveModalTab('visits')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeModalTab === 'visits'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>الزيارات التفقدية</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeModalTab === 'visits'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {roomVisitsCount}
              </span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-3 sm:p-5 overflow-y-auto space-y-5">
            {activeModalTab === 'map' ? (
              <InteractiveRoomMap room={room} />
            ) : activeModalTab === 'visits' ? (
              <div className="space-y-5">
                {/* Quick Record Inspection Visit Form */}
                <form
                  onSubmit={handleRecordRoomVisit}
                  className="bg-emerald-50/60 dark:bg-emerald-950/30 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>تسجيل زيارة ميدانية / تفقدية جديدة للقاعة</span>
                    </h3>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      إجمالي زيارات القاعة: {roomVisitsCount}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        تاريخ الزيارة
                      </label>
                      <input
                        type="date"
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        الغرض من الزيارة
                      </label>
                      <select
                        value={visitPurpose}
                        onChange={(e) => setVisitPurpose(e.target.value as VisitPurpose)}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold"
                      >
                        <option value="جولة تفقدية">جولة تفقدية روتينية</option>
                        <option value="صيانة وتنفيذ">صيانة وتنفيذ</option>
                        <option value="بلاغ طارئ">بلاغ طارئ</option>
                        <option value="تجهيز ومتابعة">تجهيز ومتابعة</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        اسم الزائر / الفني (اختياري)
                      </label>
                      <input
                        type="text"
                        value={visitorName}
                        onChange={(e) => setVisitorName(e.target.value)}
                        placeholder="مثال: أحمد السالم..."
                        className="w-full px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={visitNotes}
                      onChange={(e) => setVisitNotes(e.target.value)}
                      placeholder="ملاحظات الزيارة (مثلاً: فحص جاهزية الأجهزة والشاشة قبل الاختبارات)..."
                      className="flex-1 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                    <button
                      type="submit"
                      className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span>تسجيل الزيارة</span>
                    </button>
                  </div>
                </form>

                {/* Room Visit History Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      سجل زيارات القاعة ({roomEffectiveVisits.length} زيارة محتسبة)
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      يُحسب كل يوم فريد كزيارة واحدة حتى عند تعدد العمليات فيه
                    </span>
                  </div>

                  {roomEffectiveVisits.length === 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-8 text-center border border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                      لا توجد زيارات مسجلة لهذه القاعة حتى الآن
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                            <th className="py-2.5 px-3 w-28">تاريخ الزيارة</th>
                            <th className="py-2.5 px-3 w-36">المصدر / النوع</th>
                            <th className="py-2.5 px-3 w-28">الغرض</th>
                            <th className="py-2.5 px-3 w-24 text-center">العمليات</th>
                            <th className="py-2.5 px-3 w-32">المنفذ / الزائر</th>
                            <th className="py-2.5 px-3">الملخص والملاحظات</th>
                            <th className="py-2.5 px-3 w-14 text-center">حذف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {roomEffectiveVisits.map((ev) => (
                            <tr key={ev.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                              <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                {ev.date}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                                {ev.purpose}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-200">
                                {ev.operationsCount}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                                {ev.executors.join('، ') || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                                {ev.notes}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {ev.explicitVisitIds.length > 0 ? (
                                  <button
                                    onClick={() =>
                                      ev.explicitVisitIds.forEach((vId, idx) =>
                                        deleteVisit(vId, { silent: idx > 0 })
                                      )
                                    }
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                                    title="حذف سجل الزيارة التفقدية المسجل يدوياً"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400" title="محتسبة تلقائياً من سجل العمليات">
                                    تلقائي
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
            
            {/* 1. Live Room Outputs Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              
              <div className="bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl p-3 border border-blue-100 dark:border-blue-900/60">
                <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 mb-1">
                  <span className="text-[11px] font-bold">صيانة وتحديث</span>
                  <Wrench className="w-4 h-4" />
                </div>
                <span className="text-xl font-black text-blue-900 dark:text-blue-200">
                  {(roomOutputs?.devicesMaintained || 0) + (roomOutputs?.devicesUpdated || 0)}
                </span>
                <span className="block text-[10px] text-blue-600/80 dark:text-blue-400">
                  صيانة: {roomOutputs?.devicesMaintained || 0} • تحديث: {roomOutputs?.devicesUpdated || 0}
                </span>
              </div>

              <div className="bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl p-3 border border-indigo-100 dark:border-indigo-900/60">
                <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 mb-1">
                  <span className="text-[11px] font-bold">ترقية رام</span>
                  <Cpu className="w-4 h-4" />
                </div>
                <span className="text-xl font-black text-indigo-900 dark:text-indigo-200">
                  {roomOutputs?.devicesUpgraded || 0}
                </span>
                <span className="block text-[10px] text-indigo-600/80 dark:text-indigo-400">جهاز مرقى</span>
              </div>

              <div className="bg-cyan-50/70 dark:bg-cyan-950/30 rounded-2xl p-3 border border-cyan-100 dark:border-cyan-900/60">
                <div className="flex items-center justify-between text-cyan-700 dark:text-cyan-400 mb-1">
                  <span className="text-[11px] font-bold">هاردسكات</span>
                  <HardDrive className="w-4 h-4" />
                </div>
                <span className="text-xl font-black text-cyan-900 dark:text-cyan-200">
                  {roomOutputs?.hardDrivesReplaced || 0}
                </span>
                <span className="block text-[10px] text-cyan-600/80 dark:text-cyan-400">مبدل (SSD/HDD)</span>
              </div>

              <div className="bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl p-3 border border-amber-100 dark:border-amber-900/60">
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
                  <span className="text-[11px] font-bold">باور سبلاي</span>
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-xl font-black text-amber-900 dark:text-amber-200">
                  {roomOutputs?.powerSuppliesReplaced || 0}
                </span>
                <span className="block text-[10px] text-amber-600/80 dark:text-amber-400">وحدة مبدلة</span>
              </div>

              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-900/60">
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
                  <span className="text-[11px] font-bold">شاشات مبدلة</span>
                  <Monitor className="w-4 h-4" />
                </div>
                <span className="text-xl font-black text-emerald-900 dark:text-emerald-200">
                  {roomOutputs?.screensReplaced || 0}
                </span>
                <span className="block text-[10px] text-emerald-600/80 dark:text-emerald-400">
                  ملحقات: {roomOutputs?.itemsReplaced || 0}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/70 rounded-2xl p-3 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 mb-1">
                  <span className="text-[11px] font-bold">زيارات القاعة</span>
                  <ClipboardList className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xl font-black text-slate-900 dark:text-white">{roomVisitsCount}</span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                  {roomLastVisitDate || 'لا توجد زيارات'}
                </span>
              </div>

            </div>

            {/* 2. Screen Status Dropdown & Action row */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  حالة شاشة القاعة الحالية:
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={room.screenStatus}
                    onChange={(e) => handleStatusChange(e.target.value as ScreenStatus)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="تعمل بامتياز">تعمل بامتياز</option>
                    <option value="تحتاج صيانة">تحتاج صيانة</option>
                    <option value="مكسورة">مكسورة</option>
                    <option value="لا توجد شاشة">لا توجد شاشة</option>
                  </select>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      SCREEN_STATUS_CONFIG[room.screenStatus]?.bg || 'bg-slate-50 dark:bg-slate-800'
                    } ${SCREEN_STATUS_CONFIG[room.screenStatus]?.color || 'text-slate-700 dark:text-slate-300'} ${
                      SCREEN_STATUS_CONFIG[room.screenStatus]?.border || 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {SCREEN_STATUS_CONFIG[room.screenStatus]?.icon}
                    <span>{room.screenStatus}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons: Dedicated Notes Button + Add Operation Button + Excel */}
              <div className="flex items-center gap-2">
                
                {/* Dedicated Notes Button */}
                <button
                  onClick={() => setNotesModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800 transition-colors shadow-xs"
                >
                  <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>الملاحظات</span>
                  <span className="bg-amber-200/70 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 px-1.5 py-0.2 rounded-full text-[11px]">
                    {notesCount}
                  </span>
                </button>

                {/* Add Operation Button */}
                <button
                  onClick={handleAddNewOperation}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>إضافة عملية</span>
                </button>

                {roomLogs.length > 0 && (
                  <button
                    onClick={() =>
                      exportLogsToExcel(roomLogs, `تقرير_${room.name.replace(/\s+/g, '_')}`, {
                        periodLabel: `${currentBuilding?.name ? `${currentBuilding.name} - ` : ''}${room.name}`,
                        filters: { roomId: room.id },
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition-colors"
                    title="تصدير تقرير هذه القاعة الشامل إلى Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="hidden sm:inline">Excel</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. Room Action Logs Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>سجل العمليات المنجزة في هذه القاعة</span>
                  <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold">
                    {roomLogs.length} عملية
                  </span>
                </h3>
              </div>

              {roomLogs.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-8 text-center border border-slate-100 dark:border-slate-800">
                  <Wrench className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">لا توجد عمليات مسجلة لهذه القاعة حتى الآن</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    يمكنك النقر على زر "إضافة عملية" أعلاه لتسجيل الأعمال المنجزة
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2.5 px-3 w-24">التاريخ</th>
                        <th className="py-2.5 px-3 w-32">نوع العملية</th>
                        <th className="py-2.5 px-3 w-36">الماركة / العدد</th>
                        <th className="py-2.5 px-3">تفاصيل العمل المنجز</th>
                        <th className="py-2.5 px-3 w-28">اسم المنفذ</th>
                        <th className="py-2.5 px-3 text-center w-20">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {roomLogs.map((log) => {
                        const isEditing = editingLogId === log.id;
                        const { subAndCount, specs } = getLogSubAndSpecs(log);

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            {/* Date */}
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                                />
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{log.date}</span>
                                </div>
                              )}
                            </td>

                            {/* Category */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {isEditing ? (
                                <select
                                  value={editCategory}
                                  onChange={(e) => setEditCategory(e.target.value as OperationCategory)}
                                  className="p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold"
                                >
                                  <option value="صيانة عامة">صيانة عامة</option>
                                  <option value="ترقية رام">ترقية رام</option>
                                  <option value="تبديل هاردسك">تبديل هاردسك</option>
                                  <option value="تبديل باور سبلاي">تبديل باور سبلاي</option>
                                  <option value="شاشات">شاشات</option>
                                  <option value="استبدال">استبدال</option>
                                </select>
                              ) : (
                                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/60">
                                  {log.category}
                                </span>
                              )}
                            </td>

                            {/* Sub & Count / Specs */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editBrand}
                                    onChange={(e) => setEditBrand(e.target.value)}
                                    placeholder="الماركة"
                                    className="p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs w-20"
                                  />
                                  <input
                                    type="number"
                                    value={editCount}
                                    onChange={(e) => setEditCount(e.target.value)}
                                    placeholder="العدد"
                                    className="p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs w-14"
                                  />
                                </div>
                              ) : (
                                <div className="text-[11px]">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{subAndCount}</span>
                                  {specs && <span className="block text-slate-500 dark:text-slate-400">{specs}</span>}
                                </div>
                              )}
                            </td>

                            {/* Details */}
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-sm">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editDetails}
                                  onChange={(e) => setEditDetails(e.target.value)}
                                  className="w-full p-1.5 rounded-lg border border-blue-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                                />
                              ) : (
                                <span className="text-xs leading-relaxed">{log.actionDetails || '-'}</span>
                              )}
                            </td>

                            {/* Executor */}
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editExecutor}
                                  onChange={(e) => setEditExecutor(e.target.value)}
                                  placeholder="اسم المنفذ"
                                  className="p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs w-24"
                                />
                              ) : log.executorName ? (
                                <div className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{log.executorName}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            {/* Actions (Edit + Delete) */}
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => handleSaveEditLog(log.id)}
                                      className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                                      title="حفظ التعديل"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingLogId(null)}
                                      className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                      title="إلغاء"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleStartEditLog(log)}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                                      title="تعديل هذه العملية"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLog(log.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
            </>
            )}

          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
            <button
              onClick={() => setSelectedRoomIdForModal(null)}
              className="px-6 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
            >
              إغلاق
            </button>
          </div>

        </div>
      </div>

      {/* Dedicated Room Notes Modal */}
      {notesModalOpen && (
        <RoomNotesModal
          roomId={room.id}
          onClose={() => setNotesModalOpen(false)}
        />
      )}
    </>
  );
};
