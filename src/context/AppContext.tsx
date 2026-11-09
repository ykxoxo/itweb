'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type {
  Building,
  Room,
  MaintenanceLog,
  ScreenStatus,
  OperationCategory,
  RoomNote,
  SystemStats,
  RoomDevice,
  RoomLayoutType,
  DeviceStatus,
  DeviceNote,
  GeneralMaintenanceSubType,
  ReplacementSubType,
} from '../types';
import { INITIAL_BUILDINGS, INITIAL_ROOMS, INITIAL_LOGS, createDefaultDevices } from '../data/initialData';
import * as XLSX from 'xlsx';

export type TabType = 'dashboard' | 'rooms' | 'add-log' | 'reports';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface AppContextType {
  buildings: Building[];
  rooms: Room[];
  logs: MaintenanceLog[];
  stats: SystemStats;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  selectedBuildingId: string | null;
  setSelectedBuildingId: (id: string | null) => void;
  selectedRoomIdForModal: string | null;
  setSelectedRoomIdForModal: (id: string | null) => void;
  preselectedRoomIdForLog: string | null;
  setPreselectedRoomIdForLog: (id: string | null) => void;
  // Building actions
  addBuilding: (name: string, description?: string) => Building;
  updateBuilding: (id: string, updates: Partial<Building>) => void;
  deleteBuilding: (id: string) => void;
  getBuildingById: (id: string) => Building | undefined;
  // Room actions
  addRoom: (
    name: string,
    screenStatus: ScreenStatus,
    initialNote?: string,
    buildingId?: string,
    layoutType?: RoomLayoutType,
    totalDevices?: number
  ) => Room;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  // Room Map & Devices actions
  updateRoomDevice: (roomId: string, deviceId: string, updates: Partial<RoomDevice>) => void;
  addDeviceNote: (roomId: string, deviceId: string, text: string) => void;
  deleteDeviceNote: (roomId: string, deviceId: string, noteId: string) => void;
  bulkUpdateDevices: (
    roomId: string,
    deviceIds: string[],
    actionCategory: OperationCategory,
    newStatus: DeviceStatus,
    details?: {
      generalSubType?: GeneralMaintenanceSubType;
      replacementSubType?: ReplacementSubType;
      previousRam?: string;
      newRam?: string;
      hardDrive?: string;
      powerSupply?: string;
      deviceBrand?: string;
      noteToAppend?: string;
      actionDetails?: string;
      executorName?: string;
    }
  ) => void;
  updateRoomLayoutAndCount: (
    roomId: string,
    layoutType: RoomLayoutType,
    totalDevices: number,
    name?: string,
    screenStatus?: ScreenStatus
  ) => void;
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
  BUILDINGS: 'it_hub_buildings_v1',
  ROOMS: 'it_hub_rooms_v5',
  LOGS: 'it_hub_logs_v3',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [buildings, setBuildings] = useState<Building[]>(() => {
    if (typeof window === 'undefined') return INITIAL_BUILDINGS;
    const saved = localStorage.getItem(STORAGE_KEYS.BUILDINGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse buildings from localStorage', e);
      }
    }
    return INITIAL_BUILDINGS;
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    if (typeof window === 'undefined') return INITIAL_ROOMS;
    const saved = localStorage.getItem(STORAGE_KEYS.ROOMS) ||
                  localStorage.getItem('it_hub_rooms_v4') ||
                  localStorage.getItem('it_hub_rooms_v3') || 
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

            const layoutType: RoomLayoutType = r.layoutType || 'two-rows';
            const totalDevices: number = Number(r.totalDevices) || (Array.isArray(r.devices) && r.devices.length > 0 ? r.devices.length : 20);

            let devices: RoomDevice[] = Array.isArray(r.devices) && r.devices.length > 0 ? r.devices : [];
            if (devices.length === 0) {
              devices = createDefaultDevices(r.id || `room-${Date.now()}`, totalDevices);
            } else if (devices.length < totalDevices) {
              const diff = totalDevices - devices.length;
              const newDevices = Array.from({ length: diff }, (_, idx) => {
                const num = String(devices.length + idx + 1).padStart(2, '0');
                return {
                  id: `dev-${r.id}-${devices.length + idx + 1}-${Date.now()}`,
                  tag: `PC-${num}`,
                  status: 'لم يتم العمل عليه' as DeviceStatus,
                  ram: '16GB',
                  storage: '512GB SSD',
                };
              });
              devices = [...devices, ...newDevices];
            }

            return {
              ...r,
              buildingId: r.buildingId || INITIAL_BUILDINGS[0]?.id || 'bldg-1',
              roomNotes: notesArr,
              layoutType,
              totalDevices,
              devices,
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
    if (typeof window === 'undefined') return INITIAL_LOGS;
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
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
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

  // Persist buildings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BUILDINGS, JSON.stringify(buildings));
    } catch (e) {
      console.error('Failed to save buildings', e);
    }
  }, [buildings]);

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
      totalBuildings: buildings.length,
    };
  }, [logs, rooms, buildings]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // Building Actions
  const addBuilding = useCallback((name: string, description?: string): Building => {
    const newBuilding: Building = {
      id: `bldg-${Date.now()}`,
      name: name.trim(),
      description: description?.trim() || undefined,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setBuildings((prev) => [newBuilding, ...prev]);
    showToast(`تمت إضافة المبنى "${newBuilding.name}" بنجاح`, 'success');
    return newBuilding;
  }, [showToast]);

  const updateBuilding = useCallback((id: string, updates: Partial<Building>) => {
    setBuildings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
    showToast('تم تحديث بيانات المبنى بنجاح', 'info');
  }, [showToast]);

  const deleteBuilding = useCallback((id: string) => {
    const buildingToDelete = buildings.find((b) => b.id === id);
    const roomsInBuilding = rooms.filter((r) => r.buildingId === id);
    const roomIdsToDelete = new Set(roomsInBuilding.map((r) => r.id));

    setBuildings((prev) => prev.filter((b) => b.id !== id));
    setRooms((prev) => prev.filter((r) => !roomIdsToDelete.has(r.id)));
    setLogs((prev) => prev.filter((l) => !roomIdsToDelete.has(l.roomId)));

    if (selectedBuildingId === id) {
      setSelectedBuildingId(null);
    }
    showToast(`تم حذف المبنى "${buildingToDelete?.name || ''}" وكافة قاعاته وسجلاتها`, 'info');
  }, [buildings, rooms, selectedBuildingId, showToast]);

  const getBuildingById = useCallback((id: string): Building | undefined => {
    return buildings.find((b) => b.id === id);
  }, [buildings]);

  // Room Actions
  const addRoom = useCallback((
    name: string,
    screenStatus: ScreenStatus,
    initialNote?: string,
    buildingId?: string,
    layoutType: RoomLayoutType = 'two-rows',
    totalDevices: number = 20
  ): Room => {
    const targetBuildingId = buildingId || selectedBuildingId || (buildings.length > 0 ? buildings[0].id : 'bldg-1');
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

    const roomId = `room-${Date.now()}`;
    const safeCount = Math.max(1, Number(totalDevices) || 20);
    const generatedDevices = createDefaultDevices(roomId, safeCount);

    const newRoom: Room = {
      id: roomId,
      buildingId: targetBuildingId,
      name: name.trim(),
      screenStatus,
      roomNotes,
      layoutType: layoutType || 'two-rows',
      totalDevices: safeCount,
      devices: generatedDevices,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setRooms((prev) => [newRoom, ...prev]);
    showToast(`تمت إضافة القاعة "${newRoom.name}" بنجاح مع توزيع (${newRoom.totalDevices}) جهازاً`, 'success');
    return newRoom;
  }, [selectedBuildingId, buildings, showToast]);

  const updateRoom = useCallback((id: string, updates: Partial<Room>) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    showToast('تم تحديث بيانات القاعة بنجاح', 'info');
  }, [showToast]);

  // Room Device Actions
  const updateRoomDevice = useCallback((roomId: string, deviceId: string, updates: Partial<RoomDevice>) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const updatedDevices = (r.devices || []).map((d) =>
          d.id === deviceId ? { ...d, ...updates } : d
        );
        return { ...r, devices: updatedDevices };
      })
    );
    showToast('تم تحديث بيانات الجهاز بنجاح', 'success');
  }, [showToast]);

  const addDeviceNote = useCallback((roomId: string, deviceId: string, text: string) => {
    if (!text.trim()) return;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newNote: DeviceNote = {
      id: `dnote-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      text: text.trim(),
      date: formattedDate,
      createdAt: now.toISOString(),
    };

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const updatedDevices = (r.devices || []).map((d) => {
          if (d.id !== deviceId) return d;
          return {
            ...d,
            deviceNotes: [newNote, ...(d.deviceNotes || [])],
          };
        });
        return { ...r, devices: updatedDevices };
      })
    );
    showToast('تمت إضافة الملاحظة على الجهاز بنجاح', 'success');
  }, [showToast]);

  const deleteDeviceNote = useCallback((roomId: string, deviceId: string, noteId: string) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const updatedDevices = (r.devices || []).map((d) => {
          if (d.id !== deviceId) return d;
          return {
            ...d,
            deviceNotes: (d.deviceNotes || []).filter((n) => n.id !== noteId),
          };
        });
        return { ...r, devices: updatedDevices };
      })
    );
    showToast('تم حذف ملاحظة الجهاز', 'info');
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

  const bulkUpdateDevices = useCallback((
    roomId: string,
    deviceIds: string[],
    actionCategory: OperationCategory,
    newStatus: DeviceStatus,
    details?: {
      generalSubType?: GeneralMaintenanceSubType;
      replacementSubType?: ReplacementSubType;
      previousRam?: string;
      newRam?: string;
      hardDrive?: string;
      powerSupply?: string;
      deviceBrand?: string;
      noteToAppend?: string;
      actionDetails?: string;
      executorName?: string;
    }
  ) => {
    if (deviceIds.length === 0) return;
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    const deviceIdSet = new Set(deviceIds);
    const affectedTags = (targetRoom.devices || [])
      .filter((d) => deviceIdSet.has(d.id))
      .map((d) => d.tag);

    const now = new Date();
    const formattedDate = now.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const updatedDevices = (r.devices || []).map((d) => {
          if (deviceIdSet.has(d.id)) {
            const extraNote: DeviceNote | null = details?.noteToAppend?.trim()
              ? {
                  id: `dnote-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                  text: details.noteToAppend.trim(),
                  date: formattedDate,
                  createdAt: now.toISOString(),
                }
              : null;

            return {
              ...d,
              status: newStatus,
              ram: details?.newRam || d.ram,
              storage: details?.hardDrive || d.storage,
              powerSupply: details?.powerSupply || d.powerSupply,
              brand: details?.deviceBrand || d.brand,
              deviceNotes: extraNote ? [extraNote, ...(d.deviceNotes || [])] : (d.deviceNotes || []),
              lastMaintenanceDate: now.toISOString().split('T')[0],
            };
          }
          return d;
        });
        return { ...r, devices: updatedDevices };
      })
    );

    // Record bulk log entry
    const logDate = new Date().toISOString().split('T')[0];
    const logEntry: Omit<MaintenanceLog, 'id' | 'createdAt'> = {
      roomId,
      category: actionCategory,
      generalSubType: details?.generalSubType,
      replacementSubType: details?.replacementSubType,
      devicesCount: deviceIds.length,
      deviceBrand: details?.deviceBrand,
      previousRam: details?.previousRam,
      newRam: details?.newRam,
      hardDrive: details?.hardDrive,
      powerSupply: details?.powerSupply,
      deviceTags: affectedTags,
      actionDetails: details?.actionDetails || `إجراء مجمع على (${deviceIds.length}) أجهزة: [${affectedTags.join(', ')}]`,
      executorName: details?.executorName || 'الفريق الفني',
      date: logDate,
    };
    addLog(logEntry);

    showToast(`تم تنفيذ الإجراء المجمع بنجاح على ${deviceIds.length} جهاز`, 'success');
  }, [rooms, addLog, showToast]);

  const updateRoomLayoutAndCount = useCallback((
    roomId: string,
    layoutType: RoomLayoutType,
    totalDevices: number,
    name?: string,
    screenStatus?: ScreenStatus
  ) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        let currentDevices = [...(r.devices || [])];
        const newTotal = Math.max(1, totalDevices);

        if (currentDevices.length < newTotal) {
          const diff = newTotal - currentDevices.length;
          const newDevices = Array.from({ length: diff }, (_, idx) => {
            const num = String(currentDevices.length + idx + 1).padStart(2, '0');
            return {
              id: `dev-${r.id}-${Date.now()}-${idx}`,
              tag: `PC-${num}`,
              status: 'لم يتم العمل عليه' as DeviceStatus,
              ram: '16GB',
              storage: '512GB SSD',
              powerSupply: 'سليم (500W)',
              deviceNotes: [],
            };
          });
          currentDevices = [...currentDevices, ...newDevices];
        } else if (currentDevices.length > newTotal) {
          currentDevices = currentDevices.slice(0, newTotal);
        }

        return {
          ...r,
          name: name ? name.trim() : r.name,
          screenStatus: screenStatus || r.screenStatus,
          layoutType,
          totalDevices: newTotal,
          devices: currentDevices,
        };
      })
    );
    showToast('تم حفظ إعدادات وتخطيط القاعة بنجاح', 'success');
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



  const getRoomById = useCallback((id: string): Room | undefined => {
    return rooms.find((r) => r.id === id);
  }, [rooms]);

  const getRoomLogs = useCallback((roomId: string): MaintenanceLog[] => {
    return logs.filter((l) => l.roomId === roomId);
  }, [logs]);

  const exportLogsToExcel = useCallback((customLogs?: MaintenanceLog[], fileNamePrefix = 'تقرير_العمليات_الفنية') => {
    const targetLogs = customLogs || logs;
    const roomObjMap = new Map(rooms.map((r) => [r.id, r]));
    const buildingMap = new Map(buildings.map((b) => [b.id, b.name]));

    const formattedData = targetLogs.map((log, index) => {
      const room = roomObjMap.get(log.roomId);
      const buildingName = room?.buildingId ? (buildingMap.get(room.buildingId) || '-') : '-';

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
        'المبنى': buildingName,
        'القاعة': room?.name || 'غير محدد',
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
      { wch: 22 },
      { wch: 26 },
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
  }, [logs, rooms, buildings, showToast]);

  const exportBackupJson = useCallback(() => {
    const backupData = {
      app: 'IT Assets & Maintenance Hub',
      version: '3.1.0',
      exportedAt: new Date().toISOString(),
      buildings,
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
  }, [buildings, rooms, logs, showToast]);

  const importBackupJson = useCallback(async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data.rooms) && Array.isArray(data.logs)) {
        if (Array.isArray(data.buildings) && data.buildings.length > 0) {
          setBuildings(data.buildings);
        } else {
          setBuildings(INITIAL_BUILDINGS);
        }
        setRooms(data.rooms);
        setLogs(data.logs);
        setSelectedBuildingId(null);
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
    setBuildings(INITIAL_BUILDINGS);
    setRooms(INITIAL_ROOMS);
    setLogs(INITIAL_LOGS);
    setSelectedBuildingId(null);
    showToast('تمت إعادة ضبط النظام إلى البيانات التجريبية الافتراضية', 'info');
  }, [showToast]);

  // Memoize the entire context value to prevent unnecessary re-renders of consumer components
  const contextValue = useMemo(() => ({
    buildings,
    rooms,
    logs,
    stats,
    activeTab,
    setActiveTab,
    selectedBuildingId,
    setSelectedBuildingId,
    selectedRoomIdForModal,
    setSelectedRoomIdForModal,
    preselectedRoomIdForLog,
    setPreselectedRoomIdForLog,
    addBuilding,
    updateBuilding,
    deleteBuilding,
    getBuildingById,
    addRoom,
    updateRoom,
    deleteRoom,
    updateRoomDevice,
    addDeviceNote,
    deleteDeviceNote,
    bulkUpdateDevices,
    updateRoomLayoutAndCount,
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
    buildings,
    rooms,
    logs,
    stats,
    activeTab,
    selectedBuildingId,
    selectedRoomIdForModal,
    preselectedRoomIdForLog,
    addBuilding,
    updateBuilding,
    deleteBuilding,
    getBuildingById,
    addRoom,
    updateRoom,
    deleteRoom,
    updateRoomDevice,
    addDeviceNote,
    deleteDeviceNote,
    bulkUpdateDevices,
    updateRoomLayoutAndCount,
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
