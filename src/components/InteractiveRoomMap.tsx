'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type {
  Room,
  RoomDevice,
  DeviceStatus,
  DeviceNote,
  RoomLayoutType,
  OperationCategory,
  GeneralMaintenanceSubType,
  ReplacementSubType,
} from '../types';
import {
  Monitor,
  Cpu,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Settings,
  Edit3,
  CheckSquare,
  Square,
  DoorClosed,
  UserCheck,
  Sparkles,
  Layers,
  X,
  Save,
  Plus,
  RefreshCw,
  HardDrive,
  Info,
  Zap,
  MessageSquare,
  Trash2,
  Calendar,
  FileText,
} from 'lucide-react';

interface InteractiveRoomMapProps {
  room: Room;
}

export const DEVICE_STATUS_CONFIG: Record<
  DeviceStatus,
  { label: string; bg: string; border: string; text: string; dot: string; icon: React.ReactNode }
> = {
  'تم تحديثه': {
    label: 'تم تحديثه / جاهز',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    border: 'border-emerald-300 dark:border-emerald-700 hover:border-emerald-500',
    text: 'text-emerald-800 dark:text-emerald-200',
    dot: 'bg-emerald-500',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
  },
  'يحتاج صيانة': {
    label: 'يحتاج صيانة',
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    border: 'border-rose-300 dark:border-rose-700 hover:border-rose-500',
    text: 'text-rose-800 dark:text-rose-200',
    dot: 'bg-rose-500 animate-pulse',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
  },
  'لم يتم العمل عليه': {
    label: 'لم يتم العمل عليه',
    bg: 'bg-slate-100/90 dark:bg-slate-800/80',
    border: 'border-slate-300 dark:border-slate-700 hover:border-slate-400',
    text: 'text-slate-700 dark:text-slate-300',
    dot: 'bg-slate-400',
    icon: <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />,
  },
};

export const InteractiveRoomMap: React.FC<InteractiveRoomMapProps> = ({ room }) => {
  const {
    updateRoomDevice,
    addDeviceNote,
    deleteDeviceNote,
    bulkUpdateDevices,
    updateRoomLayoutAndCount,
    logs,
  } = useApp();

  // Selected device for modal/drawer
  const [selectedDevice, setSelectedDevice] = useState<RoomDevice | null>(null);

  // Bulk mode state
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Bulk action form states
  const [bulkCategory, setBulkCategory] = useState<OperationCategory>('ترقية رام');
  const [bulkGeneralSubType, setBulkGeneralSubType] = useState<GeneralMaintenanceSubType>('أجهزة');
  const [bulkReplacementSubType, setBulkReplacementSubType] = useState<ReplacementSubType>('أجهزة');
  const [bulkNewStatus, setBulkNewStatus] = useState<DeviceStatus>('تم تحديثه');
  const [bulkNewRam, setBulkNewRam] = useState('16GB');
  const [bulkHardDrive, setBulkHardDrive] = useState('512GB SSD');
  const [bulkPowerSupply, setBulkPowerSupply] = useState('500W أصلي');
  const [bulkDeviceBrand, setBulkDeviceBrand] = useState('Dell OptiPlex');
  const [bulkNoteToAppend, setBulkNoteToAppend] = useState('');
  const [bulkActionDetails, setBulkActionDetails] = useState('');
  const [bulkExecutorName, setBulkExecutorName] = useState('');

  // Single Device Edit Modal State
  const [deviceModalTab, setDeviceModalTab] = useState<'specs' | 'notes'>('specs');
  const [editDeviceTag, setEditDeviceTag] = useState('');
  const [editDeviceStatus, setEditDeviceStatus] = useState<DeviceStatus>('تم تحديثه');
  const [editDeviceBrand, setEditDeviceBrand] = useState('');
  const [editDeviceRam, setEditDeviceRam] = useState('');
  const [editDeviceStorage, setEditDeviceStorage] = useState('');
  const [editDevicePowerSupply, setEditDevicePowerSupply] = useState('');
  const [editDeviceNotes, setEditDeviceNotes] = useState('');
  const [newDeviceNoteInput, setNewDeviceNoteInput] = useState('');

  // Room Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsRoomName, setSettingsRoomName] = useState(room.name);
  const [settingsLayoutType, setSettingsLayoutType] = useState<RoomLayoutType>(room.layoutType || 'two-rows');
  const [settingsTotalDevices, setSettingsTotalDevices] = useState<number>(room.totalDevices || 20);

  const devices = room.devices || [];

  // Active Device derived to keep real-time notes synced without modal closing
  const activeDevice = useMemo(() => {
    if (!selectedDevice) return null;
    return devices.find((d) => d.id === selectedDevice.id) || selectedDevice;
  }, [devices, selectedDevice]);

  // Summary counts
  const updatedCount = useMemo(() => devices.filter((d) => d.status === 'تم تحديثه').length, [devices]);
  const needsMaintenanceCount = useMemo(() => devices.filter((d) => d.status === 'يحتاج صيانة').length, [devices]);
  const pendingCount = useMemo(() => devices.filter((d) => d.status === 'لم يتم العمل عليه').length, [devices]);

  // Bulk handlers
  const handleToggleDeviceSelect = (id: string) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedDeviceIds(devices.map((d) => d.id));
  };

  const handleDeselectAll = () => {
    setSelectedDeviceIds([]);
  };

  const handleApplyBulkAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDeviceIds.length === 0) return;

    let defaultActionDetails = '';
    if (bulkCategory === 'ترقية رام') {
      defaultActionDetails = `ترقية رام إلى ${bulkNewRam}`;
    } else if (bulkCategory === 'تبديل هاردسك') {
      defaultActionDetails = `تبديل هاردسك إلى ${bulkHardDrive}`;
    } else if (bulkCategory === 'تبديل باور سبلاي') {
      defaultActionDetails = `تبديل باور سبلاي: ${bulkPowerSupply}`;
    } else if (bulkCategory === 'صيانة عامة') {
      defaultActionDetails = `صيانة عامة - ${bulkGeneralSubType}`;
    } else {
      defaultActionDetails = `استبدال - ${bulkReplacementSubType}`;
    }

    bulkUpdateDevices(
      room.id,
      selectedDeviceIds,
      bulkCategory,
      bulkNewStatus,
      {
        generalSubType: bulkCategory === 'صيانة عامة' ? bulkGeneralSubType : undefined,
        replacementSubType: bulkCategory === 'استبدال' ? bulkReplacementSubType : undefined,
        newRam: bulkCategory === 'ترقية رام' ? bulkNewRam : undefined,
        hardDrive: bulkCategory === 'تبديل هاردسك' ? bulkHardDrive : undefined,
        powerSupply: bulkCategory === 'تبديل باور سبلاي' ? bulkPowerSupply : undefined,
        deviceBrand: bulkDeviceBrand || undefined,
        noteToAppend: bulkNoteToAppend.trim() || undefined,
        actionDetails: bulkActionDetails.trim() || defaultActionDetails,
        executorName: bulkExecutorName.trim() || undefined,
      }
    );

    setShowBulkModal(false);
    setSelectedDeviceIds([]);
    setIsBulkMode(false);
    setBulkNoteToAppend('');
  };

  // Open single device drawer/modal
  const handleOpenDevice = (device: RoomDevice) => {
    if (isBulkMode) {
      handleToggleDeviceSelect(device.id);
      return;
    }
    setSelectedDevice(device);
    setDeviceModalTab('specs');
    setEditDeviceTag(device.tag);
    setEditDeviceStatus(device.status);
    setEditDeviceBrand(device.brand || '');
    setEditDeviceRam(device.ram || '');
    setEditDeviceStorage(device.storage || '512GB SSD');
    setEditDevicePowerSupply(device.powerSupply || 'سليم (500W)');
    setEditDeviceNotes(device.notes || '');
    setNewDeviceNoteInput('');
  };

  const handleSaveSingleDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice || !editDeviceTag.trim()) return;

    updateRoomDevice(room.id, selectedDevice.id, {
      tag: editDeviceTag.trim(),
      status: editDeviceStatus,
      brand: editDeviceBrand.trim() || undefined,
      ram: editDeviceRam.trim() || undefined,
      storage: editDeviceStorage.trim() || undefined,
      powerSupply: editDevicePowerSupply.trim() || undefined,
      notes: editDeviceNotes.trim() || undefined,
      lastMaintenanceDate: new Date().toISOString().split('T')[0],
    });

    setSelectedDevice(null);
  };

  const handleAddNoteToDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDevice || !newDeviceNoteInput.trim()) return;
    addDeviceNote(room.id, activeDevice.id, newDeviceNoteInput.trim());
    setNewDeviceNoteInput('');
  };

  const handleDeleteNoteFromDevice = (noteId: string) => {
    if (!activeDevice) return;
    deleteDeviceNote(room.id, activeDevice.id, noteId);
  };

  // Room Settings save
  const handleOpenSettings = () => {
    setSettingsRoomName(room.name);
    setSettingsLayoutType(room.layoutType || 'two-rows');
    setSettingsTotalDevices(room.totalDevices || devices.length || 20);
    setShowSettingsModal(true);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateRoomLayoutAndCount(
      room.id,
      settingsLayoutType,
      Math.max(1, Number(settingsTotalDevices) || 1),
      settingsRoomName.trim()
    );
    setShowSettingsModal(false);
  };

  // ==========================================
  // Layout Device Partitions
  // ==========================================
  // 1. U-Shape layout partition: Left, Top, Right
  const uShapePartitions = useMemo(() => {
    const total = devices.length;
    if (total === 0) return { left: [], top: [], right: [] };
    const base = Math.floor(total / 3);
    const rem = total % 3;
    const leftCount = base + (rem >= 1 ? 1 : 0);
    const topCount = base + (rem >= 2 ? 1 : 0);

    const left = devices.slice(0, leftCount);
    const top = devices.slice(leftCount, leftCount + topCount);
    const right = devices.slice(leftCount + topCount);

    return { left, top, right };
  }, [devices]);

  // 2. Two-Rows layout partition: Left column, Right column
  const twoRowsPartitions = useMemo(() => {
    const total = devices.length;
    if (total === 0) return { left: [], right: [] };
    const half = Math.ceil(total / 2);
    const left = devices.slice(0, half);
    const right = devices.slice(half);
    return { left, right };
  }, [devices]);

  // 3. Four-Rows layout partition: 4 columns
  const fourRowsPartitions = useMemo(() => {
    const total = devices.length;
    if (total === 0) return { col1: [], col2: [], col3: [], col4: [] };
    const base = Math.floor(total / 4);
    const rem = total % 4;

    const count1 = base + (rem >= 1 ? 1 : 0);
    const count2 = base + (rem >= 2 ? 1 : 0);
    const count3 = base + (rem >= 3 ? 1 : 0);

    const col1 = devices.slice(0, count1);
    const col2 = devices.slice(count1, count1 + count2);
    const col3 = devices.slice(count1 + count2, count1 + count2 + count3);
    const col4 = devices.slice(count1 + count2 + count3);

    return { col1, col2, col3, col4 };
  }, [devices]);

  // Helper renderer for a single device node square
  const renderDeviceNode = (device: RoomDevice) => {
    const statusCfg = DEVICE_STATUS_CONFIG[device.status] || DEVICE_STATUS_CONFIG['لم يتم العمل عليه'];
    const isSelected = selectedDeviceIds.includes(device.id);
    const notesCount = (device.deviceNotes || []).length;
    const hasNotes = notesCount > 0 || Boolean(device.notes);

    return (
      <div
        key={device.id}
        onClick={() => handleOpenDevice(device)}
        className={`group relative flex flex-col items-center justify-center p-1.5 rounded-xl border-2 transition-all duration-150 cursor-pointer shadow-xs hover:shadow-md select-none w-14 h-14 sm:w-16 sm:h-16 shrink-0 ${statusCfg.bg} ${
          isSelected
            ? 'border-blue-600 ring-2 ring-blue-500/50 bg-blue-50 dark:bg-blue-950/80 scale-105 z-10'
            : `${statusCfg.border} hover:scale-105`
        }`}
        title={`${device.tag} (${device.status})\nالرام: ${device.ram || 'غير محدد'}\nالهاردسك: ${device.storage || 'غير محدد'}\nالباور سبلاي: ${device.powerSupply || 'سليم'}${hasNotes ? `\nالملاحظات: (${notesCount})` : ''}`}
      >
        {/* Bulk Checkbox */}
        {isBulkMode ? (
          <div className="absolute top-1 right-1 z-20">
            {isSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 fill-blue-100 dark:fill-blue-950" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            )}
          </div>
        ) : (
          /* Status Indicator Dot */
          <span
            className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${statusCfg.dot}`}
            title={device.status}
          />
        )}

        {/* Note Indicator Icon if device has notes */}
        {hasNotes && !isBulkMode && (
          <span
            className="absolute top-1 left-1 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-bold"
            title={`${notesCount} ملاحظة مسجلة`}
          >
            <MessageSquare className="w-2.5 h-2.5" />
          </span>
        )}

        {/* Device Icon */}
        <Monitor className="w-4 h-4 text-slate-700 dark:text-slate-200 mb-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />

        {/* Tag Label */}
        <span className="text-[10px] sm:text-[11px] font-black text-slate-900 dark:text-white truncate max-w-full tracking-tight">
          {device.tag}
        </span>

        {/* Mini spec badge */}
        <div className="flex items-center gap-0.5 text-[8px] font-bold text-slate-500 dark:text-slate-400">
          {device.storage && device.storage.includes('SSD') ? (
            <span className="text-emerald-600 dark:text-emerald-400">SSD</span>
          ) : device.ram ? (
            <span>{device.ram}</span>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar: Legend, Bulk Action & Room Settings */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        
        {/* Status Legend & Quick Counters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>تم تحديثه: {updatedCount}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>يحتاج صيانة: {needsMaintenanceCount}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span>لم يتم العمل عليه: {pendingCount}</span>
          </div>

          <span className="text-slate-400 font-bold hidden sm:inline">•</span>
          <span className="text-slate-500 dark:text-slate-400 font-bold">
            الإجمالي: {devices.length} جهاز
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Bulk Action Toggle */}
          <button
            onClick={() => {
              setIsBulkMode(!isBulkMode);
              if (isBulkMode) setSelectedDeviceIds([]);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              isBulkMode
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isBulkMode ? 'إلغاء التحديد المجمع' : 'إجراء عملية مجمعة'}</span>
          </button>

          {/* Room Settings Button */}
          <button
            onClick={handleOpenSettings}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
            title="تعديل اسم القاعة، عدد الأجهزة، أو شكل التخطيط"
          >
            <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>إعدادات القاعة</span>
          </button>
        </div>
      </div>

      {/* 2. Floating / Sticky Bulk Action Control Bar (when active) */}
      {isBulkMode && (
        <div className="bg-blue-50 dark:bg-blue-950/80 p-3 sm:p-4 rounded-2xl border-2 border-blue-300 dark:border-blue-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold text-blue-900 dark:text-blue-100">
              تم تحديد ({selectedDeviceIds.length}) من أصل ({devices.length}) جهاز
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSelectAll}
                className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-100/50"
              >
                تحديد الكل
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowBulkModal(true)}
            disabled={selectedDeviceIds.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold text-xs shadow-md transition-all disabled:cursor-not-allowed"
          >
            <CheckSquare className="w-4 h-4" />
            <span>تطبيق الإجراء على ({selectedDeviceIds.length}) أجهزة</span>
          </button>
        </div>
      )}

      {/* 3. The Visual Room Floor Canvas */}
      <div className="relative bg-slate-100/70 dark:bg-slate-950/70 p-4 sm:p-6 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800 min-h-[440px] flex flex-col justify-between overflow-x-auto">
        
        {/* Top Landmark: Smart Screen / Whiteboard in front */}
        <div className="w-full flex justify-center mb-4">
          <div className="px-5 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm border border-slate-700">
            <Monitor className="w-4 h-4 text-blue-400" />
            <span>الشاشة الرئيسية / مقدمة القاعة (Smart Screen / Whiteboard)</span>
          </div>
        </div>

        {/* Middle Area: Devices arranged according to room.layoutType */}
        <div className="flex-1 flex items-center justify-center py-2">
          
          {/* LAYOUT 1: U-Shape (شكل حرف U) */}
          {(room.layoutType === 'u-shape' || !room.layoutType) && (
            <div className="w-full max-w-4xl space-y-3">
              {/* Top Edge (Directly in front of board / screen) */}
              <div className="w-full flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  الصف العلوي المقابل للشاشة ({uShapePartitions.top.length} أجهزة)
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2 p-2 bg-slate-200/50 dark:bg-slate-900/60 rounded-2xl border border-slate-300/60 dark:border-slate-800 max-w-full">
                  {uShapePartitions.top.map(renderDeviceNode)}
                </div>
              </div>

              {/* Middle Section: Left Wing, Central Spacious Area, Right Wing */}
              <div className="w-full flex items-start justify-between gap-3 min-h-[160px]">
                {/* Left Wing (Vertical desk / counter) */}
                <div className="flex flex-col items-center p-2 bg-slate-200/50 dark:bg-slate-900/60 rounded-2xl border border-slate-300/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 whitespace-nowrap">
                    الجناح الأيسر ({uShapePartitions.left.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {uShapePartitions.left.map(renderDeviceNode)}
                  </div>
                </div>

                {/* Open Center Space */}
                <div className="flex-1 flex flex-col items-center justify-center self-stretch p-3 text-center min-w-[120px]">
                  <div className="w-full max-w-[240px] p-3 bg-white/70 dark:bg-slate-900/70 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold space-y-1">
                    <div>مساحة القاعة المركزية (حرف U)</div>
                    <div className="text-[10px] text-slate-400 font-normal">ممر حركة للطلاب والمدرب</div>
                  </div>
                </div>

                {/* Right Wing (Vertical desk / counter) */}
                <div className="flex flex-col items-center p-2 bg-slate-200/50 dark:bg-slate-900/60 rounded-2xl border border-slate-300/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 whitespace-nowrap">
                    الجناح الأيمن ({uShapePartitions.right.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {uShapePartitions.right.map(renderDeviceNode)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LAYOUT 2: Two Rows (صفين متقابلين) */}
          {room.layoutType === 'two-rows' && (
            <div className="w-full max-w-4xl flex items-start justify-between gap-6 min-h-[180px]">
              {/* Left Column */}
              <div className="flex-1">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 text-center">
                  الصف الأيسر ({twoRowsPartitions.left.length})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-slate-200/50 dark:bg-slate-900/60 rounded-2xl border border-slate-300/60 dark:border-slate-800">
                  {twoRowsPartitions.left.map(renderDeviceNode)}
                </div>
              </div>

              {/* Central Walkway */}
              <div className="h-full flex flex-col items-center justify-center px-2 self-stretch">
                <div className="h-full w-px border-r-2 border-dashed border-slate-300 dark:border-slate-700 min-h-[120px]" />
                <span className="text-[9px] font-bold text-slate-400 my-1.5 whitespace-nowrap bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                  ممر رئيسي
                </span>
                <div className="h-full w-px border-r-2 border-dashed border-slate-300 dark:border-slate-700 min-h-[120px]" />
              </div>

              {/* Right Column */}
              <div className="flex-1">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 text-center">
                  الصف الأيمن ({twoRowsPartitions.right.length})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-slate-200/50 dark:bg-slate-900/60 rounded-2xl border border-slate-300/60 dark:border-slate-800">
                  {twoRowsPartitions.right.map(renderDeviceNode)}
                </div>
              </div>
            </div>
          )}

          {/* LAYOUT 3: Four Rows (أربعة صفوف - للمختبرات الكبيرة) */}
          {room.layoutType === 'four-rows' && (
            <div className="w-full max-w-5xl grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Column 1: Far Left */}
              <div className="bg-slate-200/50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-300/60 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 text-center">
                  أقصى اليسار ({fourRowsPartitions.col1.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {fourRowsPartitions.col1.map(renderDeviceNode)}
                </div>
              </div>

              {/* Column 2: Center Left */}
              <div className="bg-slate-200/50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-300/60 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 text-center">
                  وسط يسار ({fourRowsPartitions.col2.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {fourRowsPartitions.col2.map(renderDeviceNode)}
                </div>
              </div>

              {/* Column 3: Center Right */}
              <div className="bg-slate-200/50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-300/60 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 text-center">
                  وسط يمين ({fourRowsPartitions.col3.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {fourRowsPartitions.col3.map(renderDeviceNode)}
                </div>
              </div>

              {/* Column 4: Far Right */}
              <div className="bg-slate-200/50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-300/60 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 text-center">
                  أقصى اليمين ({fourRowsPartitions.col4.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {fourRowsPartitions.col4.map(renderDeviceNode)}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* 4. Bottom Fixed Landmarks:
            - Door (الباب) at bottom-left
            - Instructor Desk (مكتب المدرب) at bottom-right */}
        <div className="w-full flex items-center justify-between pt-4 border-t-2 border-slate-200 dark:border-slate-800 mt-4 gap-3">
          
          {/* Fixed Landmark: Door */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-black shadow-xs">
            <DoorClosed className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <div className="text-right">
              <div>باب القاعة (Door)</div>
              <span className="text-[9px] text-amber-700/80 dark:text-amber-300/80 font-normal">مدخل ومخرج القاعة</span>
            </div>
          </div>

          <div className="hidden sm:block text-slate-400 text-[10px] font-bold">
            اتجاهات القاعة مضبوطة هندسياً 🧭
          </div>

          {/* Fixed Landmark: Instructor Desk */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-100/80 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 text-xs font-black shadow-xs">
            <UserCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <div className="text-right">
              <div>مكتب المدرب (Instructor)</div>
              <span className="text-[9px] text-blue-700/80 dark:text-blue-300/80 font-normal">محطة التحكم والعرض</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL 1: Single Device Details, Specs & Per-Device Notes Modal
         ========================================== */}
      {selectedDevice && activeDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <Monitor className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      بيانات وملاحظات: {activeDevice.tag}
                    </h3>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      DEVICE_STATUS_CONFIG[activeDevice.status]?.bg || ''
                    } ${DEVICE_STATUS_CONFIG[activeDevice.status]?.text || ''} ${
                      DEVICE_STATUS_CONFIG[activeDevice.status]?.border || ''
                    }`}>
                      {DEVICE_STATUS_CONFIG[activeDevice.status]?.icon}
                      <span>{activeDevice.status}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    التابعة لقاعة: <span className="font-bold text-slate-700 dark:text-slate-200">{room.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDevice(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs Switcher: Specs vs Notes */}
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setDeviceModalTab('specs')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  deviceModalTab === 'specs'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>المواصفات والبيانات الفنية</span>
              </button>

              <button
                type="button"
                onClick={() => setDeviceModalTab('notes')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  deviceModalTab === 'notes'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>سجل ملاحظات الجهاز</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  deviceModalTab === 'notes' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}>
                  {(activeDevice.deviceNotes || []).length}
                </span>
              </button>
            </div>

            {/* TAB 1: Specs & Hardware Form */}
            {deviceModalTab === 'specs' && (
              <form onSubmit={handleSaveSingleDevice} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      رقم / كود الجهاز (Tag) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editDeviceTag}
                      onChange={(e) => setEditDeviceTag(e.target.value)}
                      placeholder="مثال: PC-01 أو PC-Admin..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      حالة الجهاز الفنية
                    </label>
                    <select
                      value={editDeviceStatus}
                      onChange={(e) => setEditDeviceStatus(e.target.value as DeviceStatus)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="تم تحديثه">🟢 تم تحديثه / جاهز يعمل</option>
                      <option value="يحتاج صيانة">🔴 يحتاج صيانة</option>
                      <option value="لم يتم العمل عليه">⚪ لم يتم العمل عليه</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      سعة الرام (RAM)
                    </label>
                    <input
                      type="text"
                      value={editDeviceRam}
                      onChange={(e) => setEditDeviceRam(e.target.value)}
                      placeholder="مثال: 16GB أو 8GB..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      الهاردسك (Storage / SSD)
                    </label>
                    <input
                      type="text"
                      value={editDeviceStorage}
                      onChange={(e) => setEditDeviceStorage(e.target.value)}
                      placeholder="مثال: 512GB SSD أو 1TB NVMe..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      الباور سبلاي (Power Supply)
                    </label>
                    <input
                      type="text"
                      value={editDevicePowerSupply}
                      onChange={(e) => setEditDevicePowerSupply(e.target.value)}
                      placeholder="مثال: سليم (500W أصلي) أو تم استبداله..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      الماركة / الموديل
                    </label>
                    <input
                      type="text"
                      value={editDeviceBrand}
                      onChange={(e) => setEditDeviceBrand(e.target.value)}
                      placeholder="مثال: Dell OptiPlex 7070..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    وصف أو ملخص عام للجهاز
                  </label>
                  <textarea
                    rows={2}
                    value={editDeviceNotes}
                    onChange={(e) => setEditDeviceNotes(e.target.value)}
                    placeholder="مواصفات إضافية، موقع الجهاز في القاعة..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDevice(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ مواصفات الجهاز</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Per-Device Dedicated Notes History */}
            {deviceModalTab === 'notes' && (
              <div className="space-y-4">
                {/* Add new note form */}
                <form onSubmit={handleAddNoteToDevice} className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    إضافة ملاحظة جديدة لهذا الجهاز:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newDeviceNoteInput}
                      onChange={(e) => setNewDeviceNoteInput(e.target.value)}
                      placeholder="مثال: تم استبدال الهاردسك إلى SSD 512GB وتثبيت الويندوز..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة</span>
                    </button>
                  </div>
                </form>

                {/* Notes List */}
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {(activeDevice.deviceNotes || []).length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        لا توجد ملاحظات مسجلة لهذا الجهاز حتى الآن
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        يمكنك إضافة ملاحظة جديدة في أي وقت لتوثيق تغيير الهاردسك، الباور سبلاي، أو الصيانة.
                      </p>
                    </div>
                  ) : (
                    (activeDevice.deviceNotes || []).map((note) => (
                      <div
                        key={note.id}
                        className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 group"
                      >
                        <div className="flex-1">
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                            {note.text}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-semibold">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{note.date}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteNoteFromDevice(note.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                          title="حذف هذه الملاحظة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedDevice(null)}
                    className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: Bulk Action Modal (RAM, Storage, Power Supply, Notes)
         ========================================== */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    تنفيذ إجراء مجمع ({selectedDeviceIds.length} أجهزة)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تطبيق صيانة، تبديل هاردسكات، باور سبلاي، أو ترقية وملاحظات دفعة واحدة
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyBulkAction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  نوع الإجراء الفني المجمع
                </label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value as OperationCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="ترقية رام">⚡ ترقية رام (RAM)</option>
                  <option value="تبديل هاردسك">💾 تبديل هاردسكات (SSD / HDD)</option>
                  <option value="تبديل باور سبلاي">🔌 تبديل باور سبلاي (Power Supply)</option>
                  <option value="صيانة عامة">🔧 صيانة عامة / فورمات / تنظيف</option>
                  <option value="استبدال">🔄 استبدال قطع أخرى (ماوسات، كيبوردات، شاشات)</option>
                  <option value="شاشات">🖥️ شاشات</option>
                </select>
              </div>

              {/* RAM input if category is RAM upgrade */}
              {bulkCategory === 'ترقية رام' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    الرام الجديدة المرقى إليها
                  </label>
                  <input
                    type="text"
                    value={bulkNewRam}
                    onChange={(e) => setBulkNewRam(e.target.value)}
                    placeholder="مثال: 16GB أو 32GB"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold"
                  />
                </div>
              )}

              {/* Hard drive input if category is Hard drive swap */}
              {bulkCategory === 'تبديل هاردسك' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    سعة ونوع الهاردسك الجديد المستبدل إليه
                  </label>
                  <input
                    type="text"
                    value={bulkHardDrive}
                    onChange={(e) => setBulkHardDrive(e.target.value)}
                    placeholder="مثال: 512GB SSD أو 1TB NVMe..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold"
                  />
                </div>
              )}

              {/* Power supply input if category is Power supply swap */}
              {bulkCategory === 'تبديل باور سبلاي' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    مواصفات ونوع الباور سبلاي الجديد
                  </label>
                  <input
                    type="text"
                    value={bulkPowerSupply}
                    onChange={(e) => setBulkPowerSupply(e.target.value)}
                    placeholder="مثال: 500W أصلي جديد أو 650W..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold"
                  />
                </div>
              )}

              {/* General sub type */}
              {bulkCategory === 'صيانة عامة' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    التصنيف الفرعي للصيانة
                  </label>
                  <select
                    value={bulkGeneralSubType}
                    onChange={(e) => setBulkGeneralSubType(e.target.value as GeneralMaintenanceSubType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="أجهزة">أجهزة</option>
                    <option value="هاردسكات">هاردسكات</option>
                    <option value="باور سبلاي">باور سبلاي</option>
                    <option value="تحديث">تحديث</option>
                    <option value="تنشيط">تنشيط</option>
                    <option value="شبكة">شبكة</option>
                    <option value="تنظيم">تنظيم</option>
                  </select>
                </div>
              )}

              {/* Replacement sub type */}
              {bulkCategory === 'استبدال' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    نوع الاستبدال
                  </label>
                  <select
                    value={bulkReplacementSubType}
                    onChange={(e) => setBulkReplacementSubType(e.target.value as ReplacementSubType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="أجهزة">أجهزة</option>
                    <option value="هاردسكات">هاردسكات</option>
                    <option value="باور سبلاي">باور سبلاي</option>
                    <option value="شاشات">شاشات</option>
                    <option value="ماوسات">ماوسات</option>
                    <option value="كيبوردات">كيبوردات</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  حالة الأجهزة بعد العملية
                </label>
                <select
                  value={bulkNewStatus}
                  onChange={(e) => setBulkNewStatus(e.target.value as DeviceStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="تم تحديثه">🟢 تم تحديثه / جاهز يعمل بامتياز</option>
                  <option value="يحتاج صيانة">🔴 يحتاج صيانة</option>
                  <option value="لم يتم العمل عليه">⚪ لم يتم العمل عليه</option>
                </select>
              </div>

              {/* Append note to all selected devices */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  إضافة ملاحظة على سجل كل جهاز من الأجهزة المحددة (اختياري)
                </label>
                <input
                  type="text"
                  value={bulkNoteToAppend}
                  onChange={(e) => setBulkNoteToAppend(e.target.value)}
                  placeholder="مثال: تم تبديل الهاردسك وفحص سلامة التوصيلات..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    الماركة / الطراز (اختياري)
                  </label>
                  <input
                    type="text"
                    value={bulkDeviceBrand}
                    onChange={(e) => setBulkDeviceBrand(e.target.value)}
                    placeholder="Dell, HP..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    اسم المنفذ (اختياري)
                  </label>
                  <input
                    type="text"
                    value={bulkExecutorName}
                    onChange={(e) => setBulkExecutorName(e.target.value)}
                    placeholder="اسم الفني..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  تفاصيل العمل المنجز للسجل العام (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={bulkActionDetails}
                  onChange={(e) => setBulkActionDetails(e.target.value)}
                  placeholder="ملاحظات توثيقية إضافية للعملية المجمعة..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>تطبيق وحفظ العملية</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3: Room Settings Modal (Layout & Devices)
         ========================================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    إعدادات وتخطيط القاعة
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تعديل الاسم، عدد الأجهزة، وإعادة رسم التوزيع الهندسي
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم القاعة أو المعمل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settingsRoomName}
                  onChange={(e) => setSettingsRoomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  إجمالي عدد الأجهزة في القاعة
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSettingsTotalDevices((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-base hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    required
                    value={settingsTotalDevices}
                    onChange={(e) => setSettingsTotalDevices(parseInt(e.target.value, 10) || 1)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-center text-sm font-extrabold"
                  />
                  <button
                    type="button"
                    onClick={() => setSettingsTotalDevices((prev) => prev + 1)}
                    className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-base hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  عند زيادة العدد ستُضاف أجهزة جديدة تلقائياً، وعند إنقاصه يتم الحذف برمجياً.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  اختيار التصميم والتخطيط الهندسي للقاعة (Layout):
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'u-shape' as RoomLayoutType,
                      title: 'شكل حرف U',
                      desc: 'توزيع على الحواف (يسار، أعلى، يمين)',
                    },
                    {
                      id: 'two-rows' as RoomLayoutType,
                      title: 'صفين متقابلين',
                      desc: 'عمودين وممر مركزي مفتوح',
                    },
                    {
                      id: 'four-rows' as RoomLayoutType,
                      title: 'أربعة صفوف',
                      desc: '4 أعمدة للمختبرات الكبيرة',
                    },
                  ].map((lt) => {
                    const isSelected = settingsLayoutType === lt.id;
                    return (
                      <div
                        key={lt.id}
                        onClick={() => setSettingsLayoutType(lt.id)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-slate-900 dark:text-white">{lt.title}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                          {lt.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ وإعادة رسم الخريطة</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

