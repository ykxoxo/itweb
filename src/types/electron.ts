import type { Building, MaintenanceLog, Room, RoomVisit } from './index';

export type DesktopStorageMode = 'portable' | 'documents' | 'userData';
export type DesktopFolderTarget = 'root' | 'data' | 'reports' | 'backups';

export interface DesktopStorageInfo {
  rootDir: string;
  dataDir: string;
  reportsDir: string;
  backupsDir: string;
  dbPath: string;
  mode: DesktopStorageMode;
}

export interface DesktopDatabasePayload {
  version: string;
  updatedAt: string;
  buildings: Building[];
  rooms: Room[];
  logs: MaintenanceLog[];
  visits: RoomVisit[];
  darkMode: boolean;
  excelSeedV1Applied?: boolean;
}

export interface DesktopLoadDatabaseResult {
  exists: boolean;
  data: Partial<DesktopDatabasePayload> | null;
  source?: 'primary' | 'backup';
  error?: string;
}

export interface DesktopSaveDatabaseResult {
  ok: boolean;
  dbPath?: string;
  updatedAt?: string;
  error?: string;
}

export interface DesktopSaveFileResult {
  ok: boolean;
  filePath?: string;
  fileName?: string;
  dirPath?: string;
  error?: string;
}

export interface ElectronDesktopAPI {
  isDesktop: boolean;
  getStorageInfo: () => Promise<DesktopStorageInfo>;
  loadLocalDatabase: () => Promise<DesktopLoadDatabaseResult>;
  saveLocalDatabase: (payload: DesktopDatabasePayload) => Promise<DesktopSaveDatabaseResult>;
  saveExcelReport: (fileName: string, base64Data: string) => Promise<DesktopSaveFileResult>;
  savePdfReport: (defaultFileName: string) => Promise<DesktopSaveFileResult>;
  printCurrentPage: () => Promise<{ ok: boolean; error?: string }>;
  saveBackupFile: (fileName: string, jsonContent: string) => Promise<DesktopSaveFileResult>;
  openLocalFolder: (target?: DesktopFolderTarget) => Promise<{ ok: boolean; error?: string }>;
  openLocalFile: (filePath: string) => Promise<{ ok: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronDesktopAPI;
  }
}
