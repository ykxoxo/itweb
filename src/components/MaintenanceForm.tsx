'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type {
  OperationCategory,
  GeneralMaintenanceSubType,
  ReplacementSubType,
} from '../types';
import {
  Wrench,
  Cpu,
  Monitor,
  Building2,
  FileText,
  User,
  Calendar,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  HardDrive,
  Network,
  RotateCcw,
  Mouse,
  Keyboard,
  Layers,
  Zap,
} from 'lucide-react';

export const MaintenanceForm: React.FC = () => {
  const {
    buildings,
    rooms,
    addLog,
    preselectedRoomIdForLog,
    setPreselectedRoomIdForLog,
    setActiveTab,
    setSelectedRoomIdForModal,
  } = useApp();

  // Basic selections
  const [roomId, setRoomId] = useState<string>('');
  const [category, setCategory] = useState<OperationCategory>('صيانة عامة');

  // Sub-types
  const [generalSubType, setGeneralSubType] = useState<GeneralMaintenanceSubType>('أجهزة');
  const [replacementSubType, setReplacementSubType] = useState<ReplacementSubType>('أجهزة');

  // Counts (All Optional)
  const [devicesCount, setDevicesCount] = useState<string>('');
  const [itemsCount, setItemsCount] = useState<string>('');
  const [deviceBrand, setDeviceBrand] = useState<string>('');

  // Replacement Detailed Specs (Old vs New Device)
  const [oldDeviceName, setOldDeviceName] = useState<string>('');
  const [oldDeviceRam, setOldDeviceRam] = useState<string>('');
  const [oldDeviceStorage, setOldDeviceStorage] = useState<string>('');

  const [newDeviceName, setNewDeviceName] = useState<string>('');
  const [newDeviceRam, setNewDeviceRam] = useState<string>('');
  const [newDeviceStorage, setNewDeviceStorage] = useState<string>('');

  // RAM Upgrade Specs
  const [prevRam, setPrevRam] = useState<string>('');
  const [upgradedRam, setUpgradedRam] = useState<string>('');

  // Free text, Executor & Date (All Optional)
  const [actionDetails, setActionDetails] = useState<string>('');
  const [executorName, setExecutorName] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [lastLoggedOperation, setLastLoggedOperation] = useState<{
    roomName: string;
    category: string;
  } | null>(null);

  useEffect(() => {
    if (preselectedRoomIdForLog && rooms.some((r) => r.id === preselectedRoomIdForLog)) {
      setRoomId(preselectedRoomIdForLog);
    } else if (rooms.length > 0 && !roomId) {
      setRoomId(rooms[0].id);
    }
  }, [preselectedRoomIdForLog, rooms, roomId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const targetRoomId = roomId || (rooms.length > 0 ? rooms[0].id : '');
    if (!targetRoomId) {
      alert('يرجى اختيار أو إضافة قاعة أولاً');
      return;
    }

    const currentRoom = rooms.find((r) => r.id === targetRoomId);

    // Build the log with all optional data
    const parsedDevicesCount = devicesCount ? parseInt(devicesCount, 10) : undefined;
    const parsedItemsCount = itemsCount ? parseInt(itemsCount, 10) : undefined;

    addLog({
      roomId: targetRoomId,
      category,
      generalSubType: category === 'صيانة عامة' ? generalSubType : undefined,
      replacementSubType: category === 'استبدال' ? replacementSubType : undefined,
      devicesCount: parsedDevicesCount,
      itemsCount: parsedItemsCount,
      deviceBrand: deviceBrand.trim() || undefined,
      oldDevice:
        category === 'استبدال' && replacementSubType === 'أجهزة'
          ? {
              nameOrBrand: oldDeviceName.trim() || undefined,
              ram: oldDeviceRam.trim() || undefined,
              storage: oldDeviceStorage.trim() || undefined,
            }
          : undefined,
      newDevice:
        category === 'استبدال' && replacementSubType === 'أجهزة'
          ? {
              nameOrBrand: newDeviceName.trim() || undefined,
              ram: newDeviceRam.trim() || undefined,
              storage: newDeviceStorage.trim() || undefined,
            }
          : undefined,
      previousRam: category === 'ترقية رام' ? prevRam.trim() || undefined : undefined,
      newRam: category === 'ترقية رام' ? upgradedRam.trim() || undefined : undefined,
      actionDetails: actionDetails.trim() || undefined,
      executorName: executorName.trim() || undefined,
      date: date || new Date().toISOString().split('T')[0],
    });

    setLastLoggedOperation({
      roomName: currentRoom?.name || 'القاعة',
      category,
    });

    // Reset optional spec fields while keeping selected room for ease of adding more
    setActionDetails('');
    setDevicesCount('');
    setItemsCount('');
    setDeviceBrand('');
    setOldDeviceName('');
    setOldDeviceRam('');
    setOldDeviceStorage('');
    setNewDeviceName('');
    setNewDeviceRam('');
    setNewDeviceStorage('');
    setPrevRam('');
    setUpgradedRam('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold mb-2 border border-blue-100 dark:border-blue-900/60">
            <Sparkles className="w-3.5 h-3.5" />
            <span>تسجيل العمليات والإجراءات الفنية</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            نموذج إضافة عملية جديدة
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            تسجيل دقيق لكافة تفاصيل الصيانة والاستبدال وترقيات الرام. جميع الحقول والمعلومات اختيارية.
          </p>
        </div>
      </div>

      {/* Success Notification Bar if just logged */}
      {lastLoggedOperation && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 animate-in slide-in-from-top-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold">
                تم تسجيل عملية ({lastLoggedOperation.category}) في "{lastLoggedOperation.roomName}" بنجاح!
              </span>
              <span className="block text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
                تم تحديث الإحصائيات الفنية للقاعة والنظام تلقائياً.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                if (roomId) setSelectedRoomIdForModal(roomId);
              }}
              className="text-xs font-bold underline hover:text-emerald-950 dark:hover:text-emerald-100"
            >
              ملف القاعة
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              عرض السجل
            </button>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        
        {/* 1. Room Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>اختيار القاعة / المعمل</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('rooms')}
              className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-bold"
            >
              + إضافة قاعة جديدة
            </button>
          </label>

          <select
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value);
              setPreselectedRoomIdForLog(e.target.value);
            }}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800"
          >
            {rooms.length === 0 && <option value="">لا توجد قاعات مضافة، يرجى إضافة قاعة أولاً</option>}
            {buildings.map((building) => {
              const buildingRooms = rooms.filter((r) => r.buildingId === building.id);
              if (buildingRooms.length === 0) return null;
              return (
                <optgroup key={building.id} label={`🏢 ${building.name}`}>
                  {buildingRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} (حالة الشاشة: {room.screenStatus})
                    </option>
                  ))}
                </optgroup>
              );
            })}
            {rooms.filter((r) => !buildings.some((b) => b.id === r.buildingId)).length > 0 && (
              <optgroup label="قاعات أخرى">
                {rooms
                  .filter((r) => !buildings.some((b) => b.id === r.buildingId))
                  .map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} (حالة الشاشة: {room.screenStatus})
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* 2. Main Operation Category Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5">
            نوع العملية الأساسية:
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'صيانة عامة' as OperationCategory, label: 'صيانة عامة', icon: <Wrench className="w-5 h-5" /> },
              { id: 'استبدال' as OperationCategory, label: 'استبدال', icon: <Sparkles className="w-5 h-5" /> },
              { id: 'ترقية رام' as OperationCategory, label: 'ترقية رام', icon: <Cpu className="w-5 h-5" /> },
              { id: 'شاشات' as OperationCategory, label: 'شاشات', icon: <Monitor className="w-5 h-5" /> },
            ].map((item) => {
              const isSelected = category === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 text-xs font-bold transition-all text-center gap-2 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-sm scale-[1.02]'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    {item.icon}
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Conditional Sub-Type & Specifics */}

        {/* CASE A: صيانة عامة */}
        {category === 'صيانة عامة' && (
          <div className="bg-slate-50/80 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 space-y-4 animate-in fade-in duration-200">
            <div>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                خيارات الصيانة العامة:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'أجهزة' as GeneralMaintenanceSubType, label: 'أجهزة', icon: <HardDrive className="w-4 h-4" /> },
                  { id: 'شبكة' as GeneralMaintenanceSubType, label: 'شبكة', icon: <Network className="w-4 h-4" /> },
                  { id: 'شاشات' as GeneralMaintenanceSubType, label: 'شاشات', icon: <Monitor className="w-4 h-4" /> },
                  { id: 'تنظيم' as GeneralMaintenanceSubType, label: 'تنظيم', icon: <Layers className="w-4 h-4" /> },
                  { id: 'تحديث' as GeneralMaintenanceSubType, label: 'تحديث', icon: <RotateCcw className="w-4 h-4" /> },
                  { id: 'تنشيط' as GeneralMaintenanceSubType, label: 'تنشيط', icon: <Zap className="w-4 h-4" /> },
                ].map((sub) => {
                  const isSubSelected = generalSubType === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setGeneralSubType(sub.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                        isSubSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {sub.icon}
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If Maintenance SubType is 'أجهزة' or 'تحديث' */}
            {(generalSubType === 'أجهزة' || generalSubType === 'تحديث') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    كم جهاز تم صيانته / تحديثه؟ <span className="text-[11px] text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={devicesCount}
                    onChange={(e) => setDevicesCount(e.target.value)}
                    placeholder="مثال: 12"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    نوع / ماركة الأجهزة <span className="text-[11px] text-slate-400 font-normal">(فراغ صغير: Dell, HP...)</span>
                  </label>
                  <input
                    type="text"
                    value={deviceBrand}
                    onChange={(e) => setDeviceBrand(e.target.value)}
                    placeholder="مثال: Dell أو HP أو Lenovo"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* CASE B: استبدال */}
        {category === 'استبدال' && (
          <div className="bg-slate-50/80 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 space-y-4 animate-in fade-in duration-200">
            <div>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                تحديد المستبدل (استبدال ماذا؟):
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'أجهزة' as ReplacementSubType, label: 'أجهزة', icon: <HardDrive className="w-4 h-4" /> },
                  { id: 'هاردسكات' as ReplacementSubType, label: 'هاردسكات (SSD/HDD)', icon: <HardDrive className="w-4 h-4" /> },
                  { id: 'باور سبلاي' as ReplacementSubType, label: 'باور سبلاي (PSU)', icon: <Zap className="w-4 h-4" /> },
                  { id: 'شاشات' as ReplacementSubType, label: 'شاشات', icon: <Monitor className="w-4 h-4" /> },
                  { id: 'ماوسات' as ReplacementSubType, label: 'ماوسات', icon: <Mouse className="w-4 h-4" /> },
                  { id: 'كيبوردات' as ReplacementSubType, label: 'كيبوردات', icon: <Keyboard className="w-4 h-4" /> },
                ].map((sub) => {
                  const isSubSelected = replacementSubType === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setReplacementSubType(sub.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                        isSubSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {sub.icon}
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If replacing 'أجهزة' -> Old Device vs New Device details */}
            {replacementSubType === 'أجهزة' ? (
              <div className="space-y-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="w-full sm:w-1/3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    كم عدد الأجهزة المستبدلة؟ <span className="text-[11px] text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={devicesCount}
                    onChange={(e) => setDevicesCount(e.target.value)}
                    placeholder="مثال: 1"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Old Device Box */}
                  <div className="p-4 bg-rose-50/50 dark:bg-rose-950/30 rounded-2xl border border-rose-200/80 dark:border-rose-900/60 space-y-3">
                    <span className="text-xs font-bold text-rose-800 dark:text-rose-300 block">
                      معلومات الجهاز القديم (المستبدل):
                    </span>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                          اسم / نوع الجهاز:
                        </label>
                        <input
                          type="text"
                          value={oldDeviceName}
                          onChange={(e) => setOldDeviceName(e.target.value)}
                          placeholder="مثال: Dell 7040"
                          className="w-full px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/80 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                            الرام:
                          </label>
                          <input
                            type="text"
                            value={oldDeviceRam}
                            onChange={(e) => setOldDeviceRam(e.target.value)}
                            placeholder="مثال: 8GB"
                            className="w-full px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/80 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                            المساحة:
                          </label>
                          <input
                            type="text"
                            value={oldDeviceStorage}
                            onChange={(e) => setOldDeviceStorage(e.target.value)}
                            placeholder="مثال: 500GB HDD"
                            className="w-full px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/80 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* New Device Box */}
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 space-y-3">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                      معلومات الجهاز الجديد (المضاف):
                    </span>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                          اسم / نوع الجهاز الجديد:
                        </label>
                        <input
                          type="text"
                          value={newDeviceName}
                          onChange={(e) => setNewDeviceName(e.target.value)}
                          placeholder="مثال: HP EliteDesk 800"
                          className="w-full px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                            الرام:
                          </label>
                          <input
                            type="text"
                            value={newDeviceRam}
                            onChange={(e) => setNewDeviceRam(e.target.value)}
                            placeholder="مثال: 16GB"
                            className="w-full px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                            المساحة:
                          </label>
                          <input
                            type="text"
                            value={newDeviceStorage}
                            onChange={(e) => setNewDeviceStorage(e.target.value)}
                            placeholder="مثال: 1TB SSD"
                            className="w-full px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* If replacing screens, mouses, keyboards */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    كم عدد {replacementSubType} المستبدلة؟ <span className="text-[11px] text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={itemsCount}
                    onChange={(e) => setItemsCount(e.target.value)}
                    placeholder="مثال: 10"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    نوع / ماركة {replacementSubType} <span className="text-[11px] text-slate-400 font-normal">(فراغ صغير: Dell, HP, Logitech...)</span>
                  </label>
                  <input
                    type="text"
                    value={deviceBrand}
                    onChange={(e) => setDeviceBrand(e.target.value)}
                    placeholder="مثال: Logitech أو Dell أو HP"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* CASE C: ترقية رام */}
        {category === 'ترقية رام' && (
          <div className="bg-slate-50/80 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 space-y-4 animate-in fade-in duration-200">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              تفاصيل ترقية الرام:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  كم جهاز تمت ترقيته؟
                </label>
                <input
                  type="number"
                  min="1"
                  value={devicesCount}
                  onChange={(e) => setDevicesCount(e.target.value)}
                  placeholder="مثال: 24"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  نوع / ماركة الجهاز:
                </label>
                <input
                  type="text"
                  value={deviceBrand}
                  onChange={(e) => setDeviceBrand(e.target.value)}
                  placeholder="مثال: Dell 7070"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  الرام السابق:
                </label>
                <input
                  type="text"
                  value={prevRam}
                  onChange={(e) => setPrevRam(e.target.value)}
                  placeholder="مثال: 8GB"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  الرام الجديد:
                </label>
                <input
                  type="text"
                  value={upgradedRam}
                  onChange={(e) => setUpgradedRam(e.target.value)}
                  placeholder="مثال: 16GB"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* CASE D: شاشات */}
        {category === 'شاشات' && (
          <div className="bg-slate-50/80 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 space-y-4 animate-in fade-in duration-200">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              تفاصيل عملية الشاشات:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  كم عدد الشاشات؟
                </label>
                <input
                  type="number"
                  min="1"
                  value={devicesCount}
                  onChange={(e) => setDevicesCount(e.target.value)}
                  placeholder="مثال: 1 أو 2"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  نوع وموديل الشاشة / الحجم:
                </label>
                <input
                  type="text"
                  value={deviceBrand}
                  onChange={(e) => setDeviceBrand(e.target.value)}
                  placeholder="مثال: Samsung 75 بوصة ذكية"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. Action Details (Optional) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>تفاصيل العمل المنجز</span>
              <span className="text-[11px] text-slate-400 font-normal">(اختياري)</span>
            </span>
          </label>

          <textarea
            rows={3}
            value={actionDetails}
            onChange={(e) => setActionDetails(e.target.value)}
            placeholder="اكتب أي تفاصيل أو ملاحظات إضافية عن العملية المنفذة..."
            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* 5. Executor Name (Optional) & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>اسم المنفذ</span>
              <span className="text-[11px] text-slate-400 font-normal">(اختياري)</span>
            </label>
            <input
              type="text"
              value={executorName}
              onChange={(e) => setExecutorName(e.target.value)}
              placeholder="اكتب اسم المنفذ للعملية (اختياري)..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>تاريخ الإجراء</span>
              <span className="text-[11px] text-slate-400 font-normal">(اختياري)</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800"
            />
          </div>

        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setActionDetails('');
              setDevicesCount('');
              setItemsCount('');
            }}
            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            إفراغ النص
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
          >
            <span>حفظ وإضافة العملية الآن</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
        </div>

      </form>

    </div>
  );
};
