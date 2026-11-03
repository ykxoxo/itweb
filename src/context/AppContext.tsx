'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Room, MaintenanceLog, ScreenStatus, OperationCategory, RoomNote, SystemStats } from '../types';
import { INITIAL_ROOMS, INITIAL_LOGS } from '../data/initialData';
import * as XLSX from 'xlsx';

export type TabType = 'dashboard' | 'rooms' | 'add-log' | 'reports';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface AppContextType {
  rooms: Room[];
  logs: MaintenanceLog[];
  stats: SystemStats;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  selectedRoomIdForModal: string | null;
  setSelectedRoomIdForModal: (id: string | null) => void;
  preselectedRoomIdForLog: string | null;
  setPreselectedRoomIdForLog: (id: string | null) => void;
  // Room actions
  addRoom: (name: string, screenStatus: ScreenStatus, initialNote?: string) => Room;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  // Room Notes actions (Dated notes)
  addRoomNote: (roomId: string, text: string) => void;
  deleteRoomNote: (roomId: string, noteId: string) => void;
  updateRoomNote: (roomId: string, noteId: string, text: string) => void;
  // Log actions
  addLog: (logData: Omit<MaintenanceLog, 'id' | 'createdAt'>) => MaintenanceLog;
  updateLog: (id: string, updates: Partial<MaintenanceLog>) => void;
  deleteLog: (id: string) => void;
  // Utilities
  getRoomById: (id: string) => Room | undefined;
  getRoomLogs: (roomId: string) => MaintenanceLog[];
  exportLogsToExcel: (customLogs?: MaintenanceLog[], fileNamePrefix?: string) => void;
  exportBackupJson: () => void;
  importBackupJson: (file: File) => Promise<boolean>;
  resetToDefaultData: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  toasts: ToastState[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ROOMS: 'it_hub_rooms_v3',
  LOGS: 'it_hub_logs_v3',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ROOMS) || 
                  localStorage.getItem('it_hub_rooms_v2') || 
                  localStorage.getItem('it_hub_rooms_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((r: any) => {
            const notesArr: RoomNote[] = Array.isArray(r.roomNotes) ? r.roomNotes : [];
            if (notesArr.length === 0 && r.notes && typeof r.notes === 'string') {
              notesArr.push({
                id: `note-${Date.now()}-${Math.random()}`,
                text: r.notes,
                date: new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }),
                createdAt: new Date().toISOString(),
              });
            }
            return {
              ...r,
              roomNotes: notesArr,
            };
          });
        }
      } catch (e) {
        console.error('Failed to parse rooms from localStorage', e);
      }
    }
    return INITIAL_ROOMS;
  });

  const [logs, setLogs] = useState<MaintenanceLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGS) || 
                  localStorage.getItem('it_hub_logs_v2') || 
                  localStorage.getItem('it_hub_logs_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((l: any) => {
            let category: OperationCategory = l.category;
            if (!category) {
              if (l.actionType === 'ترقية رام' || l.actionType === 'ترقية رامات') category = 'ترقية رام';
              else if (l.actionType === 'استبدال وتحديث' || l.actionType === 'استبدال') category = 'استبدال';
              else if (l.actionType === 'شاشة' || l.actionType === 'شاشات' || l.actionType === 'تركيب شاشة') category = 'شاشات';
              else category = 'صيانة عامة';
            }
            return {
              ...l,
              category,
              executorName: l.executorName || l.technicianName || '',
            };
          });
        }
      } catch (e) {
        console.error('Failed to parse logs from localStorage', e);
      }
    }
    return INITIAL_LOGS;
  });

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedRoomIdForModal, setSelectedRoomIdForModal] = useState<string | null>(null);
  const [preselectedRoomIdForLog, setPreselectedRoomIdForLog] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('it_hub_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('it_hub_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('it_hub_theme', 'light');
      }
    }
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  // Persist rooms with requestIdleCallback/lightweight timeout to prevent UI blocking
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
    } catch (e) {
      console.error('Failed to save rooms', e);
    }
  }, [rooms]);

  // Persist logs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save logs', e);
    }
  }, [logs]);

  // Dynamic Statistics Calculations (Memoized)
  const stats: SystemStats = useMemo(() => {
    let devicesMaintained = 0;
    let devicesUpgraded = 0;
    let devicesUpdated = 0;
    let devicesReplaced = 0;
    let itemsReplaced = 0;
    let screensCount = 0;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const count = Number(log.devicesCount) || 1;
      const items = Number(log.itemsCount) || count;

      if (log.category === 'ترقية رام') {
        devicesUpgraded += count;
      } else if (log.category === 'استبدال') {
        if (log.replacementSubType === 'أجهزة') {
          devicesReplaced += count;
        } else if (log.replacementSubType === 'شاشات') {
          screensCount += items;
          itemsReplaced += items;
        } else {
          itemsReplaced += items;
        }
      } else if (log.category === 'صيانة عامة') {
        if (log.generalSubType === 'أجهزة') {
          devicesMaintained += count;
        } else if (log.generalSubType === 'تحديث') {
          devicesUpdated += count;
        } else if (log.generalSubType === 'شاشات') {
          screensCount += count;
        } else {
          devicesMaintained += count;
        }
      } else if (log.category === 'شاشات') {
        screensCount += count;
      }
    }

    return {
      totalOperations: logs.length,
      devicesMaintained,
      devicesUpgraded,
      devicesUpdated,
      devicesReplaced,
      itemsReplaced,
      screensCount,
      totalRooms: rooms.length,
    };
  }, [logs, rooms]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const addRoom = useCallback((name: string, screenStatus: ScreenStatus, initialNote?: string): Room => {
    const roomNotes: RoomNote[] = [];
    if (initialNote?.trim()) {
      const now = new Date();
      roomNotes.push({
        id: `note-${Date.now()}`,
        text: initialNote.trim(),
        date: now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        createdAt: now.toISOString(),
      });
    }

    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name: name.trim(),
      screenStatus,
      roomNotes,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setRooms((prev) => [newRoom, ...prev]);
    showToast(`تمت إضافة القاعة "${newRoom.name}" بنجاح`, 'success');
    return newRoom;
  }, [showToast]);

  const updateRoom = useCallback((id: string, updates: Partial<Room>) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    showToast('تم تحديث بيانات القاعة بنجاح', 'info');
  }, [showToast]);

  const deleteRoom = useCallback((id: string) => {
    const roomToDelete = rooms.find((r) => r.id === id);
    setRooms((prev) => prev.filter((r) => r.id !== id));
    setLogs((prev) => prev.filter((l) => l.roomId !== id));
    if (selectedRoomIdForModal === id) {
      setSelectedRoomIdForModal(null);
    }
    showToast(`تم حذف القاعة "${roomToDelete?.name || ''}" وسجلاتها الملحقة`, 'info');
  }, [rooms, selectedRoomIdForModal, showToast]);

  // Dated Room Notes CRUD
  const addRoomNote = useCallback((roomId: string, text: string) => {
    if (!text.trim()) return;
    const now = new Date();
    const newNote: RoomNote = {
      id: `note-${Date.now()}`,
      text: text.trim(),
      date: now.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdAt: now.toISOString(),
    };

    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? { ...r, roomNotes: [newNote, ...(r.roomNotes || [])] }
          : r
      )
    );
    showToast('تمت إضافة الملاحظة وحفظ التاريخ بنجاح', 'success');
  }, [showToast]);

  const deleteRoomNote = useCallback((roomId: string, noteId: string) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? { ...r, roomNotes: (r.roomNotes || []).filter((n) => n.id !== noteId) }
          : r
      )
    );
    showToast('تم حذف الملاحظة', 'info');
  }, [showToast]);

  const updateRoomNote = useCallback((roomId: string, noteId: string, text: string) => {
    if (!text.trim()) return;
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              roomNotes: (r.roomNotes || []).map((n) =>
                n.id === noteId ? { ...n, text: text.trim() } : n
              ),
            }
          : r
      )
    );
    showToast('تم تعديل الملاحظة بنجاح', 'success');
  }, [showToast]);

  const addLog = useCallback((logData: Omit<MaintenanceLog, 'id' | 'createdAt'>): MaintenanceLog => {
    const newLog: MaintenanceLog = {
      ...logData,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    setLogs((prev) => [newLog, ...prev]);
    showToast(`تم حفظ وإضافة العملية بنجاح`, 'success');
    return newLog;
  }, [showToast]);

  const updateLog = useCallback((id: string, updates: Partial<MaintenanceLog>) => {
    setLogs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
    showToast('تم تعديل العملية بنجاح', 'info');
  }, [showToast]);

  const deleteLog = useCallback((id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    showToast('تم حذف العملية بنجاح', 'info');
  }, [showToast]);

  const getRoomById = useCallback((id: string): Room | undefined => {
    return rooms.find((r) => r.id === id);
  }, [rooms]);

  const getRoomLogs = useCallback((roomId: string): MaintenanceLog[] => {
    return logs.filter((l) => l.roomId === roomId);
  }, [logs]);

  const exportLogsToExcel = useCallback((customLogs?: MaintenanceLog[], fileNamePrefix = 'تقرير_العمليات_الفنية') => {
    const targetLogs = customLogs || logs;
    const roomMap = new Map(rooms.map((r) => [r.id, r.name]));

    const formattedData = targetLogs.map((log, index) => {
      let subTypeText = '-';
      if (log.category === 'صيانة عامة' && log.generalSubType) {
        subTypeText = log.generalSubType;
      } else if (log.category === 'استبدال' && log.replacementSubType) {
        subTypeText = `استبدال ${log.replacementSubType}`;
      }

      let countText = '-';
      if (log.devicesCount) countText = `${log.devicesCount} جهاز`;
      else if (log.itemsCount) countText = `${log.itemsCount} قطعة`;

      let brandOrSpecs = log.deviceBrand || '';
      if (log.category === 'استبدال' && log.oldDevice && log.newDevice) {
        brandOrSpecs = `قديم: ${log.oldDevice.nameOrBrand || ''} (${log.oldDevice.ram || ''}/${log.oldDevice.storage || ''}) -> جديد: ${log.newDevice.nameOrBrand || ''} (${log.newDevice.ram || ''}/${log.newDevice.storage || ''})`;
      } else if (log.category === 'ترقية رام' && (log.previousRam || log.newRam)) {
        brandOrSpecs = `${log.deviceBrand || ''} [من ${log.previousRam || ''} إلى ${log.newRam || ''}]`;
      }

      return {
        'م': index + 1,
        'تاريخ الإجراء': log.date,
        'القاعة': roomMap.get(log.roomId) || 'غير محدد',
        'نوع العملية': log.category,
        'التصنيف الفرعي': subTypeText,
        'العدد': countText,
        'الماركة / المواصفات': brandOrSpecs,
        'تفاصيل العمل المنجز': log.actionDetails || '',
        'اسم المنفذ': log.executorName || 'غير محدد',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل العمليات الفنية');

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 35 },
      { wch: 45 },
      { wch: 22 },
    ];

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${fileNamePrefix}_${today}.xlsx`);
    showToast('تم تحميل ملف Excel بنجاح', 'success');
  }, [logs, rooms, showToast]);

  const exportBackupJson = useCallback(() => {
    const backupData = {
      app: 'IT Assets & Maintenance Hub',
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      rooms,
      logs,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `it_hub_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير النسخة الاحتياطية بنجاح', 'success');
  }, [rooms, logs, showToast]);

  const importBackupJson = useCallback(async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data.rooms) && Array.isArray(data.logs)) {
        setRooms(data.rooms);
        setLogs(data.logs);
        showToast('تمت استعادة النسخة الاحتياطية بنجاح', 'success');
        return true;
      } else {
        throw new Error('صيغة الملف غير متوافقة');
      }
    } catch (err) {
      showToast('فشل استيراد الملف: يرجى التأكد من اختيار ملف JSON صحيح', 'error');
      return false;
    }
  }, [showToast]);

  const resetToDefaultData = useCallback(() => {
    setRooms(INITIAL_ROOMS);
    setLogs(INITIAL_LOGS);
    showToast('تمت إعادة ضبط النظام إلى البيانات التجريبية الافتراضية', 'info');
  }, [showToast]);

  // Memoize the entire context value to prevent unnecessary re-renders of consumer components
  const contextValue = useMemo(() => ({
    rooms,
    logs,
    stats,
    activeTab,
    setActiveTab,
    selectedRoomIdForModal,
    setSelectedRoomIdForModal,
    preselectedRoomIdForLog,
    setPreselectedRoomIdForLog,
    addRoom,
    updateRoom,
    deleteRoom,
    addRoomNote,
    deleteRoomNote,
    updateRoomNote,
    addLog,
    updateLog,
    deleteLog,
    getRoomById,
    getRoomLogs,
    exportLogsToExcel,
    exportBackupJson,
    importBackupJson,
    resetToDefaultData,
    darkMode,
    toggleDarkMode,
    toasts,
    showToast,
  }), [
    rooms,
    logs,
    stats,
    activeTab,
    selectedRoomIdForModal,
    preselectedRoomIdForLog,
    addRoom,
    updateRoom,
    deleteRoom,
    addRoomNote,
    deleteRoomNote,
    updateRoomNote,
    addLog,
    updateLog,
    deleteLog,
    getRoomById,
    getRoomLogs,
    exportLogsToExcel,
    exportBackupJson,
    importBackupJson,
    resetToDefaultData,
    darkMode,
    toggleDarkMode,
    toasts,
    showToast,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
