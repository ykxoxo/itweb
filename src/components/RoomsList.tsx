'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenStatus } from '../types';
import { RoomNotesModal } from './RoomNotesModal';
import {
  Building2,
  Plus,
  Search,
  Monitor,
  Cpu,
  Wrench,
  Trash2,
  ExternalLink,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
} from 'lucide-react';

export const SCREEN_STATUS_CONFIG: Record<
  ScreenStatus,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  'تعمل بامتياز': {
    label: 'تعمل بامتياز',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  },
  'تحتاج صيانة': {
    label: 'تحتاج صيانة',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
  },
  'مكسورة': {
    label: 'مكسورة',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: <XCircle className="w-4 h-4 text-rose-600" />,
  },
  'لا توجد شاشة': {
    label: 'لا توجد شاشة',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    icon: <HelpCircle className="w-4 h-4 text-slate-500" />,
  },
};

export const RoomsList: React.FC = () => {
  const {
    rooms,
    logs,
    addRoom,
    deleteRoom,
    setSelectedRoomIdForModal,
    setActiveTab,
    setPreselectedRoomIdForLog,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [notesRoomId, setNotesRoomId] = useState<string | null>(null);

  // Form states for adding new room
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomScreenStatus, setNewRoomScreenStatus] = useState<ScreenStatus>('تعمل بامتياز');
  const [newRoomInitialNote, setNewRoomInitialNote] = useState('');

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    addRoom(newRoomName, newRoomScreenStatus, newRoomInitialNote);
    setNewRoomName('');
    setNewRoomInitialNote('');
    setNewRoomScreenStatus('تعمل بامتياز');
    setShowAddModal(false);
  };

  const handleDeleteRoomClick = (e: React.MouseEvent, roomId: string, roomName: string) => {
    e.stopPropagation();
    const count = logs.filter((l) => l.roomId === roomId).length;
    const confirmMessage = count > 0
      ? `تحذير: القاعة "${roomName}" تحتوي على (${count}) سجل عملية. هل أنت متأكد من حذف القاعة وكافة سجلاتها؟`
      : `هل أنت متأكد من حذف القاعة "${roomName}"؟`;

    if (window.confirm(confirmMessage)) {
      deleteRoom(roomId);
    }
  };

  const handleQuickAddOperation = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    setPreselectedRoomIdForLog(roomId);
    setActiveTab('add-log');
  };

  const handleOpenNotes = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    setNotesRoomId(roomId);
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const notesText = (room.roomNotes || []).map((n) => n.text).join(' ');
      const matchesSearch =
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notesText.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || room.screenStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rooms, searchQuery, statusFilter]);

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-blue-600" />
              <span>نظام إدارة القاعات والمعامل</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              إجمالي القاعات المسجلة: <span className="font-bold text-blue-700">{rooms.length}</span> قاعة
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>إضافة قاعة جديدة</span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم القاعة أو في الملاحظات..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">حالة الشاشة:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto py-2.5 px-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="all">جميع الحالات ({rooms.length})</option>
              <option value="تعمل بامتياز">تعمل بامتياز</option>
              <option value="تحتاج صيانة">تحتاج صيانة</option>
              <option value="مكسورة">مكسورة</option>
              <option value="لا توجد شاشة">لا توجد شاشة</option>
            </select>
          </div>
        </div>

        {/* Rooms Grid */}
        {filteredRooms.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">لم يتم العثور على أي قاعات مطابقة</h3>
            <p className="text-xs text-slate-400 mt-1">جرّب تغيير كلمات البحث أو إعادة تعيين فلتر حالة الشاشة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => {
              const roomLogs = logs.filter((l) => l.roomId === room.id);
              const ramCount = roomLogs.filter((l) => l.actionType === 'ترقية رام').length;
              const screenCount = roomLogs.filter((l) => l.actionType === 'شاشة').length;
              const notesCount = (room.roomNotes || []).length;
              const statusConfig = SCREEN_STATUS_CONFIG[room.screenStatus] || SCREEN_STATUS_CONFIG['لا توجد شاشة'];

              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoomIdForModal(room.id)}
                  className="group relative bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-blue-400 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    {/* Top Bar: Screen Status Badge + Delete */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
                      >
                        {statusConfig.icon}
                        <span>شاشة القاعة: {room.screenStatus}</span>
                      </span>

                      <button
                        onClick={(e) => handleDeleteRoomClick(e, room.id, room.name)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="حذف القاعة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Room Name */}
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors flex items-center justify-between">
                      <span>{room.name}</span>
                      <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>

                    {/* Direct Notes Trigger Button on card */}
                    <div className="mt-3">
                      <button
                        onClick={(e) => handleOpenNotes(e, room.id)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/70 text-amber-800 text-xs font-bold transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-amber-600" />
                          <span>الملاحظات</span>
                        </span>
                        <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-[11px]">
                          {notesCount} ملاحظة
                        </span>
                      </button>
                    </div>

                    {/* Live Room Stats Pills */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
                      <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                        <div className="flex items-center justify-center text-blue-600 mb-1">
                          <Wrench className="w-4 h-4" />
                        </div>
                        <span className="block text-sm font-black text-slate-800">{roomLogs.length}</span>
                        <span className="text-[10px] text-slate-500 font-medium">عمليات</span>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                        <div className="flex items-center justify-center text-indigo-600 mb-1">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <span className="block text-sm font-black text-slate-800">{ramCount}</span>
                        <span className="text-[10px] text-slate-500 font-medium">ترقيات رام</span>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                        <div className="flex items-center justify-center text-emerald-600 mb-1">
                          <Monitor className="w-4 h-4" />
                        </div>
                        <span className="block text-sm font-black text-slate-800">{screenCount}</span>
                        <span className="text-[10px] text-slate-500 font-medium">شاشات</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Buttons (Renamed to إضافة عملية) */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-blue-600 group-hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>فتح ملف القاعة</span>
                    </span>

                    <button
                      onClick={(e) => handleQuickAddOperation(e, room.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all"
                      title="إضافة عملية جديدة لهذه القاعة"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>إضافة عملية</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add New Room Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">إضافة قاعة جديدة</h3>
                    <p className="text-xs text-slate-500">قم بإدخال بيانات القاعة لتسجيلها في النظام</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    اسم القاعة أو المعمل <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="مثال: قاعة التدريب 102، معمل الشبكات..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    حالة الشاشة الحالية في القاعة
                  </label>
                  <select
                    value={newRoomScreenStatus}
                    onChange={(e) => setNewRoomScreenStatus(e.target.value as ScreenStatus)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="تعمل بامتياز">تعمل بامتياز</option>
                    <option value="تحتاج صيانة">تحتاج صيانة</option>
                    <option value="مكسورة">مكسورة</option>
                    <option value="لا توجد شاشة">لا توجد شاشة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ملاحظة أولية (اختياري)
                  </label>
                  <textarea
                    rows={2}
                    value={newRoomInitialNote}
                    onChange={(e) => setNewRoomInitialNote(e.target.value)}
                    placeholder="ملاحظات افتتاحية أو مواصفات خاصة بالقاعة..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-sm transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors"
                  >
                    حفظ القاعة
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Room Notes Modal if triggered from list */}
      {notesRoomId && (
        <RoomNotesModal
          roomId={notesRoomId}
          onClose={() => setNotesRoomId(null)}
        />
      )}
    </>
  );
};
