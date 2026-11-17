'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  RoomVisit,
  VisitPurpose,
} from '../types';
import type { DesktopStorageInfo, DesktopFolderTarget } from '../types/electron';
import {
  INITIAL_BUILDINGS,
  INITIAL_ROOMS,
  INITIAL_LOGS,
  INITIAL_VISITS,
  createDefaultDevices,
  createDefaultInstructorDevice,
} from '../data/initialData';
import {
  EXCEL_SEED_FLAG_KEY,
  mergeBuiltinExcelSeedIntoState,
} from '../data/excelSeedMerge';
import { computeSystemStats } from '../utils/reportAggregator';
import { exportComprehensiveReportToExcel } from '../utils/excelExporter';
import {
  normalizeArabicForMatch,
  normalizeBuildingMatchKey,
  type ParsedExcelRow,
  type ExcelImportOptions,
} from '../utils/excelLocationImporter';

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
  visits: RoomVisit[];
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
  updateRoomDevice: (roomId: string, deviceId: string, updates: Partial<RoomDevice>, options?: { silent?: boolean }) => void;
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
  addLog: (logData: Omit<MaintenanceLog, 'id' | 'createdAt'>, options?: { silent?: boolean }) => MaintenanceLog;
  updateLog: (id: string, updates: Partial<MaintenanceLog>) => void;
  deleteLog: (id: string) => void;
  // Visit actions
  addVisit: (visitData: {
    roomId: string;
    date?: string;
    visitorName?: string;
    purpose?: VisitPurpose;
    notes?: string;
  }) => RoomVisit;
  deleteVisit: (id: string, options?: { silent?: boolean }) => void;
  // Utilities
  getRoomById: (id: string) => Room | undefined;
  getRoomLogs: (roomId: string) => MaintenanceLog[];
  exportLogsToExcel: (
    customLogs?: MaintenanceLog[],
    fileNamePrefix?: string,
    options?: {
      periodLabel?: string;
      filters?: {
        buildingId?: string;
        roomId?: string;
        dateFrom?: string;
        dateTo?: string;
        includeExplicitVisits?: boolean;
      };
    }
  ) => Promise<void>;
  exportBackupJson: () => Promise<void>;
  importBackupJson: (file: File) => Promise<boolean>;
  importExcelSchedule: (
    rows: ParsedExcelRow[],
    options: ExcelImportOptions
  ) => {
    buildingsCreated: number;
    roomsCreated: number;
    visitsAdded: number;
    logsAdded: number;
    skippedDuplicates: number;
  };
  resetToDefaultData: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  toasts: ToastState[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  desktopStorageInfo: DesktopStorageInfo | null;
  lastSavedReport: {
    type: 'excel' | 'pdf' | 'backup';
    filePath: string;
    fileName: string;
    savedAt: string;
  } | null;
  savePdfReportLocal: (
    fileNamePrefix?: string
  ) => Promise<{ ok: boolean; filePath?: string; fileName?: string; error?: string } | null>;
  openLocalFolder: (target?: DesktopFolderTarget) => Promise<void>;
  openLocalFile: (filePath: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  BUILDINGS: 'it_hub_buildings_v1',
  ROOMS: 'it_hub_rooms_v5',
  LOGS: 'it_hub_logs_v3',
  VISITS: 'it_hub_visits_v1',
};

let entitySeq = 0;
function nextEntityId(prefix: string): string {
  entitySeq += 1;
  return `${prefix}-${Date.now()}-${entitySeq}`;
}

function normalizeLoadedRooms(rawRooms: any[]): Room[] {
  return rawRooms.map((r: any) => {
    const roomId = r.id || nextEntityId('room');
    const notesArr: RoomNote[] = Array.isArray(r.roomNotes) ? r.roomNotes : [];
    if (notesArr.length === 0 && r.notes && typeof r.notes === 'string') {
      notesArr.push({
        id: nextEntityId('note'),
        text: r.notes,
        date: new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }),
        createdAt: new Date().toISOString(),
      });
    }

    const layoutType: RoomLayoutType = r.layoutType || 'two-rows';
    const totalDevices: number =
      Number(r.totalDevices) || (Array.isArray(r.devices) && r.devices.length > 0 ? r.devices.length : 20);

    let devices: RoomDevice[] = Array.isArray(r.devices) && r.devices.length > 0 ? r.devices : [];
    if (devices.length === 0) {
      devices = createDefaultDevices(roomId, totalDevices);
    } else if (devices.length < totalDevices) {
      const diff = totalDevices - devices.length;
      const newDevices = Array.from({ length: diff }, (_, idx) => {
        const num = String(devices.length + idx + 1).padStart(2, '0');
        return {
          id: nextEntityId(`dev-${roomId}-${devices.length + idx + 1}`),
          tag: `PC-${num}`,
          status: 'لم يتم العمل عليه' as DeviceStatus,
          ram: '16GB',
          storage: '512GB SSD',
        };
      });
      devices = [...devices, ...newDevices];
    }

    const instructorDevice: RoomDevice | undefined =
      r.instructorDevice && typeof r.instructorDevice === 'object'
        ? {
            ...r.instructorDevice,
            id: r.instructorDevice.id || `dev-${roomId}-instructor`,
            tag: r.instructorDevice.tag || 'PC-Instructor',
            status: r.instructorDevice.status || 'لم يتم العمل عليه',
            deviceNotes: Array.isArray(r.instructorDevice.deviceNotes)
              ? r.instructorDevice.deviceNotes
              : [],
          }
        : r.skipAutoInstructorDevice
          ? undefined
          : devices.length > 0 || totalDevices > 0
            ? createDefaultInstructorDevice(roomId)
            : undefined;

    return {
      ...r,
      id: roomId,
      buildingId: r.buildingId || INITIAL_BUILDINGS[0]?.id || 'bldg-1',
      roomNotes: notesArr,
      layoutType,
      totalDevices,
      devices,
      instructorDevice,
    };
  });
}

function updateDeviceInRoom(
  room: Room,
  deviceId: string,
  updater: (device: RoomDevice) => RoomDevice
): Room {
  const instructorId = room.instructorDevice?.id || `dev-${room.id}-instructor`;
  if (deviceId === instructorId) {
    const currentInstructor = room.instructorDevice || createDefaultInstructorDevice(room.id);
    return {
      ...room,
      skipAutoInstructorDevice: false,
      instructorDevice: updater(currentInstructor),
    };
  }
  return {
    ...room,
    devices: (room.devices || []).map((d) => (d.id === deviceId ? updater(d) : d)),
  };
}

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
          return normalizeLoadedRooms(parsed);
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

  const [visits, setVisits] = useState<RoomVisit[]>(() => {
    if (typeof window === 'undefined') return INITIAL_VISITS;
    const saved = localStorage.getItem(STORAGE_KEYS.VISITS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse visits from localStorage', e);
      }
    }
    const hasAnySavedStorage = Boolean(
      localStorage.getItem(STORAGE_KEYS.BUILDINGS) ||
        localStorage.getItem(STORAGE_KEYS.ROOMS) ||
        localStorage.getItem(STORAGE_KEYS.LOGS)
    );
    return hasAnySavedStorage ? [] : INITIAL_VISITS;
  });

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedRoomIdForModal, setSelectedRoomIdForModal] = useState<string | null>(null);
  const [preselectedRoomIdForLog, setPreselectedRoomIdForLog] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [desktopStorageInfo, setDesktopStorageInfo] = useState<DesktopStorageInfo | null>(null);
  const [desktopHydrated, setDesktopHydrated] = useState<boolean>(false);
  const [lastSavedReport, setLastSavedReport] = useState<{
    type: 'excel' | 'pdf' | 'backup';
    filePath: string;
    fileName: string;
    savedAt: string;
  } | null>(null);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('it_hub_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const latestStateRef = useRef({ buildings, rooms, logs, visits, darkMode });
  latestStateRef.current = { buildings, rooms, logs, visits, darkMode };

  // Hydrate state from local disk JSON database when running as Desktop program,
  // or apply one-time built-in Excel seed merge for existing browser localStorage users.
  useEffect(() => {
    if (typeof window === 'undefined') {
      setDesktopHydrated(true);
      return;
    }

    const applySeedIfNeeded = (
      baseBuildings: Building[],
      baseRooms: Room[],
      baseVisits: RoomVisit[],
      flagAlreadyApplied: boolean
    ) => {
      const hasXlsRooms = baseRooms.some((r) => r.id.startsWith('room-xls-'));
      if (flagAlreadyApplied || hasXlsRooms) {
        try {
          localStorage.setItem(EXCEL_SEED_FLAG_KEY, 'applied');
        } catch {}
        return { buildings: baseBuildings, rooms: baseRooms, visits: baseVisits, merged: false };
      }
      const res = mergeBuiltinExcelSeedIntoState(
        baseBuildings,
        baseRooms,
        baseVisits,
        nextEntityId
      );
      try {
        localStorage.setItem(EXCEL_SEED_FLAG_KEY, 'applied');
      } catch {}
      return { buildings: res.buildings, rooms: res.rooms, visits: res.visits, merged: true };
    };

    if (!window.electronAPI?.isDesktop) {
      const browserFlag = localStorage.getItem(EXCEL_SEED_FLAG_KEY) === 'applied';
      const synced = applySeedIfNeeded(
        latestStateRef.current.buildings,
        latestStateRef.current.rooms,
        latestStateRef.current.visits,
        browserFlag
      );
      if (synced.merged) {
        setBuildings(synced.buildings);
        setRooms(synced.rooms);
        setVisits(synced.visits);
      }
      setDesktopHydrated(true);
      return;
    }

    const api = window.electronAPI;
    let cancelled = false;

    (async () => {
      try {
        const info = await api.getStorageInfo();
        if (!cancelled) {
          setDesktopStorageInfo(info);
        }

        const res = await api.loadLocalDatabase();
        if (!cancelled && res?.exists && res.data) {
          const db = res.data;
          const dbBuildings =
            Array.isArray(db.buildings) && db.buildings.length > 0
              ? db.buildings
              : latestStateRef.current.buildings;
          const dbRooms = Array.isArray(db.rooms)
            ? normalizeLoadedRooms(db.rooms)
            : latestStateRef.current.rooms;
          const dbLogs = Array.isArray(db.logs) ? db.logs : latestStateRef.current.logs;
          const dbVisits = Array.isArray(db.visits) ? db.visits : latestStateRef.current.visits;

          const synced = applySeedIfNeeded(
            dbBuildings,
            dbRooms,
            dbVisits,
            Boolean(db.excelSeedV1Applied)
          );

          setBuildings(synced.buildings);
          setRooms(synced.rooms);
          setLogs(dbLogs);
          setVisits(synced.visits);
          if (typeof db.darkMode === 'boolean') {
            setDarkMode(db.darkMode);
          }
        } else if (!cancelled) {
          const browserFlag = localStorage.getItem(EXCEL_SEED_FLAG_KEY) === 'applied';
          const synced = applySeedIfNeeded(
            latestStateRef.current.buildings,
            latestStateRef.current.rooms,
            latestStateRef.current.visits,
            browserFlag
          );
          if (synced.merged) {
            setBuildings(synced.buildings);
            setRooms(synced.rooms);
            setVisits(synced.visits);
          }
        }
      } catch (err) {
        console.error('Failed to hydrate desktop local database', err);
      } finally {
        if (!cancelled) {
          setDesktopHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Coordinated local disk persistence (with rolling atomic backup inside Electron)
  useEffect(() => {
    if (!desktopHydrated || typeof window === 'undefined' || !window.electronAPI?.saveLocalDatabase) {
      return;
    }

    const api = window.electronAPI;
    const timer = setTimeout(() => {
      api
        .saveLocalDatabase({
          version: '3.2.0',
          updatedAt: new Date().toISOString(),
          buildings,
          rooms,
          logs,
          visits,
          darkMode,
          excelSeedV1Applied: true,
        })
        .catch((err) => console.error('Failed to save desktop local database', err));
    }, 220);

    return () => clearTimeout(timer);
  }, [desktopHydrated, buildings, rooms, logs, visits, darkMode]);

  // Flush latest state immediately on window close / page hide in desktop mode
  useEffect(() => {
    if (!desktopHydrated || typeof window === 'undefined' || !window.electronAPI?.saveLocalDatabase) {
      return;
    }

    const api = window.electronAPI;
    const flushNow = () => {
      const snapshot = latestStateRef.current;
      api
        .saveLocalDatabase({
          version: '3.2.0',
          updatedAt: new Date().toISOString(),
          ...snapshot,
          excelSeedV1Applied: true,
        })
        .catch(() => {});
    };

    window.addEventListener('pagehide', flushNow);
    window.addEventListener('beforeunload', flushNow);
    return () => {
      window.removeEventListener('pagehide', flushNow);
      window.removeEventListener('beforeunload', flushNow);
    };
  }, [desktopHydrated]);

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

  // Persist visits
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(visits));
    } catch (e) {
      console.error('Failed to save visits', e);
    }
  }, [visits]);

  // Dynamic Statistics Calculations (Unified via reportAggregator)
  const stats: SystemStats = useMemo(
    () => computeSystemStats(buildings, rooms, logs, visits),
    [buildings, rooms, logs, visits]
  );

  const lastToastIdRef = useRef<number>(0);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.max(Date.now() * 1000, lastToastIdRef.current + 1);
    lastToastIdRef.current = id;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // Building Actions
  const addBuilding = useCallback((name: string, description?: string): Building => {
    const newBuilding: Building = {
      id: nextEntityId('bldg'),
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
    setVisits((prev) => prev.filter((v) => !roomIdsToDelete.has(v.roomId)));

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
        id: nextEntityId('note'),
        text: initialNote.trim(),
        date: now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        createdAt: now.toISOString(),
      });
    }

    const roomId = nextEntityId('room');
    const safeCount = Math.max(1, Number(totalDevices) || 20);
    const generatedDevices = createDefaultDevices(roomId, safeCount);
    const instructorDevice = createDefaultInstructorDevice(roomId);

    const newRoom: Room = {
      id: roomId,
      buildingId: targetBuildingId,
      name: name.trim(),
      screenStatus,
      roomNotes,
      layoutType: layoutType || 'two-rows',
      totalDevices: safeCount,
      devices: generatedDevices,
      instructorDevice,
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
  const updateRoomDevice = useCallback(
    (roomId: string, deviceId: string, updates: Partial<RoomDevice>, options?: { silent?: boolean }) => {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId
            ? updateDeviceInRoom(r, deviceId, (d) => ({ ...d, ...updates }))
            : r
        )
      );
      if (!options?.silent) {
        showToast('تم تحديث بيانات الجهاز بنجاح', 'success');
      }
    },
    [showToast]
  );

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
      id: nextEntityId('dnote'),
      text: text.trim(),
      date: formattedDate,
      createdAt: now.toISOString(),
    };

    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? updateDeviceInRoom(r, deviceId, (d) => ({
              ...d,
              deviceNotes: [newNote, ...(d.deviceNotes || [])],
            }))
          : r
      )
    );
    showToast('تمت إضافة الملاحظة على الجهاز بنجاح', 'success');
  }, [showToast]);

  const deleteDeviceNote = useCallback((roomId: string, deviceId: string, noteId: string) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? updateDeviceInRoom(r, deviceId, (d) => ({
              ...d,
              deviceNotes: (d.deviceNotes || []).filter((n) => n.id !== noteId),
            }))
          : r
      )
    );
    showToast('تم حذف ملاحظة الجهاز', 'info');
  }, [showToast]);

  const addLog = useCallback(
    (logData: Omit<MaintenanceLog, 'id' | 'createdAt'>, options?: { silent?: boolean }): MaintenanceLog => {
      const newLog: MaintenanceLog = {
        ...logData,
        id: nextEntityId('log'),
        createdAt: new Date().toISOString(),
      };
      setLogs((prev) => [newLog, ...prev]);
      if (!options?.silent) {
        showToast(`تم حفظ وإضافة العملية بنجاح`, 'success');
      }
      return newLog;
    },
    [showToast]
  );

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

  const addVisit = useCallback(
    (visitData: {
      roomId: string;
      date?: string;
      visitorName?: string;
      purpose?: VisitPurpose;
      notes?: string;
    }): RoomVisit => {
      const targetRoom = rooms.find((r) => r.id === visitData.roomId);
      const newVisit: RoomVisit = {
        id: nextEntityId('visit'),
        roomId: visitData.roomId,
        date: visitData.date || new Date().toISOString().split('T')[0],
        visitorName: visitData.visitorName?.trim() || undefined,
        purpose: visitData.purpose || 'جولة تفقدية',
        notes: visitData.notes?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      setVisits((prev) => [newVisit, ...prev]);
      showToast(
        `تم تسجيل زيارة لـ "${targetRoom?.name || 'القاعة'}" بتاريخ ${newVisit.date}`,
        'success'
      );
      return newVisit;
    },
    [rooms, showToast]
  );

  const deleteVisit = useCallback(
    (id: string, options?: { silent?: boolean }) => {
      setVisits((prev) => prev.filter((v) => v.id !== id));
      if (!options?.silent) {
        showToast('تم حذف سجل الزيارة التفقدية', 'info');
      }
    },
    [showToast]
  );

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
    const instructorDeviceForRoom =
      targetRoom.instructorDevice || createDefaultInstructorDevice(targetRoom.id);
    const allTargetDevices = [...(targetRoom.devices || []), instructorDeviceForRoom];
    const affectedTags = allTargetDevices
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

    const applyBulkChanges = (d: RoomDevice): RoomDevice => {
      if (!deviceIdSet.has(d.id)) return d;
      const extraNote: DeviceNote | null = details?.noteToAppend?.trim()
        ? {
            id: nextEntityId('dnote'),
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
    };

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const currentInstructor = r.instructorDevice || createDefaultInstructorDevice(r.id);
        return {
          ...r,
          devices: (r.devices || []).map(applyBulkChanges),
          instructorDevice: applyBulkChanges(currentInstructor),
        };
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
    addLog(logEntry, { silent: true });

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
              id: nextEntityId(`dev-${r.id}-${idx}`),
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
    setVisits((prev) => prev.filter((v) => v.roomId !== id));
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
      id: nextEntityId('note'),
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

  const exportLogsToExcel = useCallback(
    async (
      customLogs?: MaintenanceLog[],
      fileNamePrefix = 'تقرير_المخرجات_الشامل',
      options?: {
        periodLabel?: string;
        filters?: {
          buildingId?: string;
          roomId?: string;
          dateFrom?: string;
          dateTo?: string;
          includeExplicitVisits?: boolean;
        };
      }
    ) => {
      const desktopSave = typeof window !== 'undefined' ? window.electronAPI?.saveExcelReport : undefined;

      if (desktopSave) {
        const result = exportComprehensiveReportToExcel({
          buildings,
          rooms,
          logs: customLogs || logs,
          visits,
          periodLabel: options?.periodLabel || 'التقرير الشامل للمخرجات والزيارات والعمليات',
          fileNamePrefix,
          writeFile: false,
          filters: options?.filters,
        });

        const res = await desktopSave(result.fileName, result.base64Data || '');
        if (res.ok && res.filePath && res.fileName) {
          setLastSavedReport({
            type: 'excel',
            filePath: res.filePath,
            fileName: res.fileName,
            savedAt: new Date().toISOString(),
          });
          showToast(`تم حفظ تقرير Excel محلياً: ${res.fileName}`, 'success');
          return;
        }
        showToast('تعذر حفظ التقرير في المجلد المحلي، سيتم المحاولة عبر التنزيل المباشر', 'error');
      }

      exportComprehensiveReportToExcel({
        buildings,
        rooms,
        logs: customLogs || logs,
        visits,
        periodLabel: options?.periodLabel || 'التقرير الشامل للمخرجات والزيارات والعمليات',
        fileNamePrefix,
        writeFile: true,
        filters: options?.filters,
      });
      showToast('تم تحميل تقرير Excel الشامل متعدد الأوراق بنجاح', 'success');
    },
    [logs, rooms, buildings, visits, showToast]
  );

  const exportBackupJson = useCallback(async () => {
    const backupData = {
      app: 'IT Assets & Maintenance Hub',
      version: '3.2.0',
      exportedAt: new Date().toISOString(),
      buildings,
      rooms,
      logs,
      visits,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const fileName = `it_hub_backup_${new Date().toISOString().split('T')[0]}.json`;
    const desktopBackup = typeof window !== 'undefined' ? window.electronAPI?.saveBackupFile : undefined;

    if (desktopBackup) {
      const res = await desktopBackup(fileName, jsonString);
      if (res.ok && res.filePath && res.fileName) {
        setLastSavedReport({
          type: 'backup',
          filePath: res.filePath,
          fileName: res.fileName,
          savedAt: new Date().toISOString(),
        });
        showToast(`تم حفظ النسخة الاحتياطية محلياً: ${res.fileName}`, 'success');
        return;
      }
      showToast('فشل حفظ النسخة الاحتياطية محلياً', 'error');
      return;
    }

    const blob = new Blob([jsonString], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير النسخة الاحتياطية بنجاح', 'success');
  }, [buildings, rooms, logs, visits, showToast]);

  const savePdfReportLocal = useCallback(
    async (fileNamePrefix = 'تقرير_المخرجات_الشامل') => {
      if (typeof window === 'undefined' || !window.electronAPI?.savePdfReport) {
        return null;
      }

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
      const defaultName = `${fileNamePrefix}_${dateStr}_${timeStr}.pdf`;

      const res = await window.electronAPI.savePdfReport(defaultName);
      if (res.ok && res.filePath && res.fileName) {
        setLastSavedReport({
          type: 'pdf',
          filePath: res.filePath,
          fileName: res.fileName,
          savedAt: new Date().toISOString(),
        });
        showToast(`تم حفظ التقرير PDF محلياً: ${res.fileName}`, 'success');
      } else {
        showToast('تعذر إنشاء ملف PDF محلياً', 'error');
      }
      return res;
    },
    [showToast]
  );

  const openLocalFolder = useCallback(
    async (target: DesktopFolderTarget = 'root') => {
      if (typeof window === 'undefined' || !window.electronAPI?.openLocalFolder) return;
      const res = await window.electronAPI.openLocalFolder(target);
      if (!res.ok) {
        showToast('تعذر فتح المجلد المحلي', 'error');
      }
    },
    [showToast]
  );

  const openLocalFile = useCallback(
    async (filePath: string) => {
      if (typeof window === 'undefined' || !window.electronAPI?.openLocalFile) return;
      const res = await window.electronAPI.openLocalFile(filePath);
      if (!res.ok) {
        showToast('تعذر فتح الملف المحلي', 'error');
      }
    },
    [showToast]
  );

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
        setRooms(normalizeLoadedRooms(data.rooms));
        setLogs(data.logs);
        setVisits(Array.isArray(data.visits) ? data.visits : []);
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

  const importExcelSchedule = useCallback(
    (rows: ParsedExcelRow[], options: ExcelImportOptions) => {
      const selectedRows = rows.filter((r) => r.selected);
      const isReplace = options.mode === 'replace';

      const nextBuildings: Building[] = isReplace ? [] : [...buildings];
      const nextRooms: Room[] = isReplace ? [] : [...rooms];
      const nextLogs: MaintenanceLog[] = isReplace ? [] : [...logs];
      const nextVisits: RoomVisit[] = isReplace ? [] : [...visits];

      const buildingMap = new Map<string, Building>();
      for (const b of nextBuildings) {
        buildingMap.set(normalizeBuildingMatchKey(b.name), b);
      }

      const roomMap = new Map<string, Room>();
      for (const r of nextRooms) {
        roomMap.set(`${r.buildingId}__${normalizeArabicForMatch(r.name)}`, r);
      }

      const existingVisitDates = new Set<string>(
        nextVisits.map((v) => `${v.roomId}__${(v.date || '').slice(0, 10)}`)
      );

      let buildingsCreated = 0;
      let roomsCreated = 0;
      let visitsAdded = 0;
      let logsAdded = 0;
      let skippedDuplicates = 0;

      const deviceCount = Math.max(1, Number(options.deviceCountPerRoom) || 1);
      const todayIso = new Date().toISOString().split('T')[0];

      for (const item of selectedRows) {
        const cleanBldgName = item.location.buildingName.trim() || 'مبنى غير محدد';
        const cleanRoomName = item.location.roomName.trim() || item.rawLocation.trim();
        const bldgMatchKey = normalizeBuildingMatchKey(cleanBldgName);

        let targetBuilding = buildingMap.get(bldgMatchKey);
        if (!targetBuilding) {
          targetBuilding = {
            id: nextEntityId('bldg'),
            name: cleanBldgName,
            description: `تم إنشاؤه تلقائياً من استيراد Excel (الرمز: ${item.location.buildingCode})`,
            createdAt: item.date || todayIso,
          };
          buildingMap.set(bldgMatchKey, targetBuilding);
          nextBuildings.push(targetBuilding);
          buildingsCreated += 1;
        }

        const roomLookupKey = `${targetBuilding.id}__${normalizeArabicForMatch(cleanRoomName)}`;
        let targetRoom = roomMap.get(roomLookupKey);
        if (!targetRoom) {
          const roomId = nextEntityId('room');
          const devices = Array.from({ length: deviceCount }, (_, i) => ({
            id: `dev-${roomId}-${i + 1}`,
            tag: `PC-${String(i + 1).padStart(2, '0')}`,
            status: 'لم يتم العمل عليه' as DeviceStatus,
            brand: 'Dell OptiPlex',
            ram: '16GB',
            storage: '512GB SSD',
            powerSupply: 'سليم (500W)',
            deviceNotes: [],
          }));

          targetRoom = {
            id: roomId,
            buildingId: targetBuilding.id,
            name: cleanRoomName,
            screenStatus: 'تعمل بامتياز',
            roomNotes: [],
            layoutType: 'u-shape',
            totalDevices: deviceCount,
            devices,
            instructorDevice: options.includeInstructorDevice
              ? createDefaultInstructorDevice(roomId, 'لم يتم العمل عليه')
              : undefined,
            skipAutoInstructorDevice: !options.includeInstructorDevice,
            createdAt: item.date || todayIso,
          };
          roomMap.set(roomLookupKey, targetRoom);
          nextRooms.push(targetRoom);
          roomsCreated += 1;
        }

        const visitKey = `${targetRoom.id}__${item.date}`;
        if (options.deduplicateSameDayVisits && existingVisitDates.has(visitKey)) {
          skippedDuplicates += 1;
          continue;
        }
        existingVisitDates.add(visitKey);

        nextVisits.push({
          id: nextEntityId('visit'),
          roomId: targetRoom.id,
          date: item.date,
          purpose: 'صيانة وتنفيذ',
          notes: `استيراد Excel (${cleanRoomName})`,
          createdAt: new Date().toISOString(),
        });
        visitsAdded += 1;

        if (options.recordAs === 'visits-and-logs') {
          nextLogs.push({
            id: nextEntityId('log'),
            roomId: targetRoom.id,
            category: 'صيانة عامة',
            generalSubType: 'أجهزة',
            devicesCount: 1,
            actionDetails: `توزيع تلقائي من ملف Excel (${cleanRoomName})`,
            date: item.date,
            createdAt: new Date().toISOString(),
          });
          logsAdded += 1;
        }
      }

      // Sort visits newest first cleanly
      nextVisits.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      if (options.recordAs === 'visits-and-logs' || isReplace) {
        nextLogs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setLogs(nextLogs);
      }

      setBuildings(nextBuildings);
      setRooms(nextRooms);
      setVisits(nextVisits);
      if (isReplace) {
        setSelectedBuildingId(null);
      }

      showToast(
        `تم التوزيع بنجاح: ${buildingsCreated} مبنى جديد، ${roomsCreated} قاعة، ${visitsAdded} تاريخ زيارة`,
        'success'
      );

      return {
        buildingsCreated,
        roomsCreated,
        visitsAdded,
        logsAdded,
        skippedDuplicates,
      };
    },
    [buildings, rooms, logs, visits, showToast]
  );

  const resetToDefaultData = useCallback(() => {
    setBuildings(INITIAL_BUILDINGS);
    setRooms(INITIAL_ROOMS);
    setLogs(INITIAL_LOGS);
    setVisits(INITIAL_VISITS);
    setSelectedBuildingId(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(EXCEL_SEED_FLAG_KEY, 'applied');
      } catch {}
    }
    showToast('تمت إعادة ضبط النظام إلى البيانات الافتراضية المحدثة', 'info');
  }, [showToast]);

  // Memoize the entire context value to prevent unnecessary re-renders of consumer components
  const contextValue = useMemo(() => ({
    buildings,
    rooms,
    logs,
    visits,
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
    addVisit,
    deleteVisit,
    getRoomById,
    getRoomLogs,
    exportLogsToExcel,
    exportBackupJson,
    importBackupJson,
    importExcelSchedule,
    resetToDefaultData,
    darkMode,
    toggleDarkMode,
    toasts,
    showToast,
    desktopStorageInfo,
    lastSavedReport,
    savePdfReportLocal,
    openLocalFolder,
    openLocalFile,
  }), [
    buildings,
    rooms,
    logs,
    visits,
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
    addVisit,
    deleteVisit,
    getRoomById,
    getRoomLogs,
    exportLogsToExcel,
    exportBackupJson,
    importBackupJson,
    importExcelSchedule,
    resetToDefaultData,
    darkMode,
    toggleDarkMode,
    toasts,
    showToast,
    desktopStorageInfo,
    lastSavedReport,
    savePdfReportLocal,
    openLocalFolder,
    openLocalFile,
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
