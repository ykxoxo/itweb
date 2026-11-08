'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenStatus, Building } from '../types';
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
  ArrowRight,
  Layers,
  Edit2,
  FolderOpen,
  ChevronLeft,
} from 'lucide-react';

export const SCREEN_STATUS_CONFIG: Record<
  ScreenStatus,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  'تعمل بامتياز': {
    label: 'تعمل بامتياز',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
  },
  'تحتاج صيانة': {
    label: 'تحتاج صيانة',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    border: 'border-amber-200 dark:border-amber-800',
    icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
  },
  'مكسورة': {
    label: 'مكسورة',
    color: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-950/50',
    border: 'border-rose-200 dark:border-rose-800',
    icon: <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
  },
  'لا توجد شاشة': {
    label: 'لا توجد شاشة',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
    icon: <HelpCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />,
  },
};

export const RoomsList: React.FC = () => {
  const {
    buildings,
    rooms,
    logs,
    selectedBuildingId,
    setSelectedBuildingId,
    addBuilding,
    updateBuilding,
    deleteBuilding,
    addRoom,
    deleteRoom,
    setSelectedRoomIdForModal,
    setActiveTab,
    setPreselectedRoomIdForLog,
  } = useApp();

  // Search and filter states
  const [buildingSearchQuery, setBuildingSearchQuery] = useState('');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Building modals state
  const [showAddBuildingModal, setShowAddBuildingModal] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingDesc, setNewBuildingDesc] = useState('');

  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [editBuildingName, setEditBuildingName] = useState('');
  const [editBuildingDesc, setEditBuildingDesc] = useState('');

  // Room modals state
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomScreenStatus, setNewRoomScreenStatus] = useState<ScreenStatus>('تعمل بامتياز');
  const [newRoomInitialNote, setNewRoomInitialNote] = useState('');
  const [notesRoomId, setNotesRoomId] = useState<string | null>(null);

  // Selected Building
  const currentBuilding = useMemo(() => {
    if (!selectedBuildingId) return null;
    return buildings.find((b) => b.id === selectedBuildingId) || null;
  }, [buildings, selectedBuildingId]);

  // Filtered Buildings for Level 1
  const filteredBuildings = useMemo(() => {
    return buildings.filter((bldg) => {
      const q = buildingSearchQuery.toLowerCase();
      const matchName = bldg.name.toLowerCase().includes(q);
      const matchDesc = (bldg.description || '').toLowerCase().includes(q);
      return matchName || matchDesc;
    });
  }, [buildings, buildingSearchQuery]);

  // Filtered Rooms for Level 2 (inside currentBuilding)
  const roomsInCurrentBuilding = useMemo(() => {
    if (!selectedBuildingId) return [];
    return rooms.filter((r) => r.buildingId === selectedBuildingId);
  }, [rooms, selectedBuildingId]);

  const filteredRooms = useMemo(() => {
    return roomsInCurrentBuilding.filter((room) => {
      const notesText = (room.roomNotes || []).map((n) => n.text).join(' ');
      const matchesSearch =
        room.name.toLowerCase().includes(roomSearchQuery.toLowerCase()) ||
        notesText.toLowerCase().includes(roomSearchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || room.screenStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [roomsInCurrentBuilding, roomSearchQuery, statusFilter]);

  // Handlers for Building
  const handleCreateBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuildingName.trim()) return;

    const created = addBuilding(newBuildingName.trim(), newBuildingDesc.trim());
    setNewBuildingName('');
    setNewBuildingDesc('');
    setShowAddBuildingModal(false);
    // Open the newly created building directly so the user can immediately add rooms
    setSelectedBuildingId(created.id);
  };

  const handleStartEditBuilding = (e: React.MouseEvent, bldg: Building) => {
    e.stopPropagation();
    setEditingBuilding(bldg);
    setEditBuildingName(bldg.name);
    setEditBuildingDesc(bldg.description || '');
  };

  const handleSaveEditBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBuilding || !editBuildingName.trim()) return;

    updateBuilding(editingBuilding.id, {
      name: editBuildingName.trim(),
      description: editBuildingDesc.trim() || undefined,
    });
    setEditingBuilding(null);
  };

  const handleDeleteBuildingClick = (e: React.MouseEvent, bldg: Building) => {
    e.stopPropagation();
    const roomsCount = rooms.filter((r) => r.buildingId === bldg.id).length;
    const confirmMessage = roomsCount > 0
      ? `تحذير هام: المبنى "${bldg.name}" يحتوي على (${roomsCount}) قاعة ومعمل.\nحذف المبنى سيحذف كافة القاعات التابعة له وجميع سجلاتها الفنية.\nهل أنت متأكد من الحذف؟`
      : `هل أنت متأكد من حذف المبنى "${bldg.name}"؟`;

    if (window.confirm(confirmMessage)) {
      deleteBuilding(bldg.id);
    }
  };

  // Handlers for Room
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !selectedBuildingId) return;

    addRoom(newRoomName, newRoomScreenStatus, newRoomInitialNote, selectedBuildingId);
    setNewRoomName('');
    setNewRoomInitialNote('');
    setNewRoomScreenStatus('تعمل بامتياز');
    setShowAddRoomModal(false);
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

  // ==========================================
  // LEVEL 2: Rooms View inside Selected Building
  // ==========================================
  if (selectedBuildingId && currentBuilding) {
    return (
      <>
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Breadcrumb & Navigation Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">
                <button
                  onClick={() => setSelectedBuildingId(null)}
                  className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>المباني</span>
                </button>
                <span>/</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{currentBuilding.name}</span>
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <FolderOpen className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                <span>قاعات {currentBuilding.name}</span>
              </h1>
              {currentBuilding.description && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                  {currentBuilding.description}
                </p>
              )}
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                إجمالي القاعات في هذا المبنى: <span className="font-bold text-blue-600 dark:text-blue-400">{roomsInCurrentBuilding.length}</span> قاعة
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedBuildingId(null)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm transition-all"
              >
                <ArrowRight className="w-4 h-4" />
                <span>الرجوع للمباني</span>
              </button>

              <button
                onClick={() => setShowAddRoomModal(true)}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>إضافة قاعة في المبنى</span>
              </button>
            </div>
          </div>

          {/* Filter and Search Bar for Rooms */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={roomSearchQuery}
                onChange={(e) => setRoomSearchQuery(e.target.value)}
                placeholder="بحث باسم القاعة أو في الملاحظات..."
                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">حالة الشاشة:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="all">جميع الحالات ({roomsInCurrentBuilding.length})</option>
                <option value="تعمل بامتياز">تعمل بامتياز</option>
                <option value="تحتاج صيانة">تحتاج صيانة</option>
                <option value="مكسورة">مكسورة</option>
                <option value="لا توجد شاشة">لا توجد شاشة</option>
              </select>
            </div>
          </div>

          {/* Rooms Grid */}
          {filteredRooms.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                {roomsInCurrentBuilding.length === 0
                  ? `لا توجد قاعات مضافة في "${currentBuilding.name}" حتى الآن`
                  : 'لم يتم العثور على أي قاعات مطابقة لبحثك'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                {roomsInCurrentBuilding.length === 0
                  ? 'ابدأ بإضافة أول قاعة أو معمل في هذا المبنى'
                  : 'جرّب تغيير كلمات البحث أو إعادة تعيين فلتر حالة الشاشة'}
              </p>
              {roomsInCurrentBuilding.length === 0 && (
                <button
                  onClick={() => setShowAddRoomModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>إضافة أول قاعة في هذا المبنى</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map((room) => {
                const roomLogs = logs.filter((l) => l.roomId === room.id);
                const ramCount = roomLogs.filter((l) => l.category === 'ترقية رام').length;
                const screenCount = roomLogs.filter((l) => l.category === 'شاشات' || l.replacementSubType === 'شاشات').length;
                const notesCount = (room.roomNotes || []).length;
                const statusConfig = SCREEN_STATUS_CONFIG[room.screenStatus] || SCREEN_STATUS_CONFIG['لا توجد شاشة'];

                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomIdForModal(room.id)}
                    className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
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
                          className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                          title="حذف القاعة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Room Name */}
                      <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center justify-between">
                        <span>{room.name}</span>
                        <ExternalLink className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>

                      {/* Direct Notes Trigger Button on card */}
                      <div className="mt-3">
                        <button
                          onClick={(e) => handleOpenNotes(e, room.id)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 border border-amber-200/70 dark:border-amber-800/70 text-amber-800 dark:text-amber-300 text-xs font-bold transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span>الملاحظات</span>
                          </span>
                          <span className="bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full text-[11px]">
                            {notesCount} ملاحظة
                          </span>
                        </button>
                      </div>

                      {/* Live Room Stats Pills */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-800/70 rounded-xl p-2.5 text-center">
                          <div className="flex items-center justify-center text-blue-600 dark:text-blue-400 mb-1">
                            <Wrench className="w-4 h-4" />
                          </div>
                          <span className="block text-sm font-black text-slate-800 dark:text-white">{roomLogs.length}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">عمليات</span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/70 rounded-xl p-2.5 text-center">
                          <div className="flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-1">
                            <Cpu className="w-4 h-4" />
                          </div>
                          <span className="block text-sm font-black text-slate-800 dark:text-white">{ramCount}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">ترقيات رام</span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/70 rounded-xl p-2.5 text-center">
                          <div className="flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-1">
                            <Monitor className="w-4 h-4" />
                          </div>
                          <span className="block text-sm font-black text-slate-800 dark:text-white">{screenCount}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">شاشات</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1">
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
          {showAddRoomModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">إضافة قاعة جديدة</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        التابعة لـ: <span className="font-bold text-blue-600 dark:text-blue-400">{currentBuilding.name}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddRoomModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      اسم القاعة أو المعمل <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="مثال: معمل الذكاء الاصطناعي (101)، قاعة الاجتماعات..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      حالة الشاشة الحالية في القاعة
                    </label>
                    <select
                      value={newRoomScreenStatus}
                      onChange={(e) => setNewRoomScreenStatus(e.target.value as ScreenStatus)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="تعمل بامتياز">تعمل بامتياز</option>
                      <option value="تحتاج صيانة">تحتاج صيانة</option>
                      <option value="مكسورة">مكسورة</option>
                      <option value="لا توجد شاشة">لا توجد شاشة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      ملاحظة أولية (اختياري)
                    </label>
                    <textarea
                      rows={2}
                      value={newRoomInitialNote}
                      onChange={(e) => setNewRoomInitialNote(e.target.value)}
                      placeholder="ملاحظات افتتاحية أو مواصفات خاصة بالقاعة..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddRoomModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm transition-colors"
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
  }

  // ==========================================
  // LEVEL 1: Buildings Overview Grid
  // ==========================================
  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              <span>نظام إدارة المباني والقاعات</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              اختر المبنى المطلوب لاستعراض قاعاته ومعامله، أو أضف مبنى جديداً للمجمع.
            </p>
            <div className="flex items-center gap-4 text-xs font-bold mt-2">
              <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-lg border border-blue-100 dark:border-blue-900/60">
                إجمالي المباني: {buildings.length} مبنى
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/60">
                إجمالي القاعات: {rooms.length} قاعة
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowAddBuildingModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>إضافة مبنى جديد</span>
          </button>
        </div>

        {/* Filter and Search Bar for Buildings */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={buildingSearchQuery}
              onChange={(e) => setBuildingSearchQuery(e.target.value)}
              placeholder="بحث باسم المبنى أو الرمز أو الوصف..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Buildings Grid */}
        {filteredBuildings.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">لم يتم العثور على أي مبانٍ مطابقة</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">جرّب تغيير كلمات البحث أو أضف مبنى جديداً</p>
            <button
              onClick={() => setShowAddBuildingModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>إضافة مبنى جديد الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBuildings.map((bldg) => {
              const bldgRooms = rooms.filter((r) => r.buildingId === bldg.id);
              const bldgRoomIds = new Set(bldgRooms.map((r) => r.id));
              const bldgLogs = logs.filter((l) => bldgRoomIds.has(l.roomId));

              const screensWorking = bldgRooms.filter((r) => r.screenStatus === 'تعمل بامتياز').length;
              const screensNeedsMaintenance = bldgRooms.filter((r) => r.screenStatus === 'تحتاج صيانة' || r.screenStatus === 'مكسورة').length;

              return (
                <div
                  key={bldg.id}
                  onClick={() => setSelectedBuildingId(bldg.id)}
                  className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    {/* Top Row: Building Icon, Badge & Action Menu */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                        <Building2 className="w-6 h-6" />
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleStartEditBuilding(e, bldg)}
                          className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition-colors"
                          title="تعديل اسم أو وصف المبنى"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteBuildingClick(e, bldg)}
                          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                          title="حذف المبنى"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Building Name & Description */}
                    <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center justify-between">
                      <span>{bldg.name}</span>
                      <ChevronLeft className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:-translate-x-1 transition-all" />
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 min-h-[32px]">
                      {bldg.description || 'لا يوجد وصف مضاف لهذا المبنى.'}
                    </p>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="bg-slate-50 dark:bg-slate-800/70 rounded-2xl p-3 text-center">
                        <span className="block text-lg font-black text-blue-600 dark:text-blue-400">
                          {bldgRooms.length}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          قاعة ومعمل
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/70 rounded-2xl p-3 text-center">
                        <span className="block text-lg font-black text-indigo-600 dark:text-indigo-400">
                          {bldgLogs.length}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          عملية مسجلة
                        </span>
                      </div>
                    </div>

                    {/* Screen Status mini-pill */}
                    <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      <span>جاهزية الشاشات:</span>
                      <div className="flex items-center gap-2 font-bold">
                        <span className="text-emerald-600 dark:text-emerald-400">{screensWorking} تعمل</span>
                        {screensNeedsMaintenance > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">• {screensNeedsMaintenance} صيانة</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Action Link */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                    <span className="flex items-center gap-1.5 group-hover:underline">
                      <FolderOpen className="w-4 h-4" />
                      <span>دخول واستعراض القاعات ({bldgRooms.length})</span>
                    </span>
                    <span className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:-translate-x-1 transition-transform">
                      ⬅
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add New Building Modal */}
        {showAddBuildingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">إضافة مبنى جديد</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">قم بإدخال بيانات المبنى لإنشاء قاعات ومعامل بداخله</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddBuildingModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateBuilding} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    اسم المبنى أو الرمز <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newBuildingName}
                    onChange={(e) => setNewBuildingName(e.target.value)}
                    placeholder="مثال: مبنى التدريب المشترك (C)، مبنى كلية التقنية..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    وصف المبنى أو الأقسام التابعة له (اختياري)
                  </label>
                  <textarea
                    rows={3}
                    value={newBuildingDesc}
                    onChange={(e) => setNewBuildingDesc(e.target.value)}
                    placeholder="مثال: يضم معامل البرمجة، الشبكات، وقاعات المحاضرات العامة..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddBuildingModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors"
                  >
                    إنشاء المبنى
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Building Modal */}
        {editingBuilding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">تعديل بيانات المبنى</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">تحديث اسم أو وصف المبنى</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingBuilding(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditBuilding} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    اسم المبنى أو الرمز <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editBuildingName}
                    onChange={(e) => setEditBuildingName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    الوصف (اختياري)
                  </label>
                  <textarea
                    rows={3}
                    value={editBuildingDesc}
                    onChange={(e) => setEditBuildingDesc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingBuilding(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors"
                  >
                    حفظ التعديلات
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
};