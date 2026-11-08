export type ScreenStatus = 
  | 'تعمل بامتياز' 
  | 'تحتاج صيانة' 
  | 'مكسورة' 
  | 'لا توجد شاشة';

export type OperationCategory = 
  | 'صيانة عامة' 
  | 'استبدال' 
  | 'ترقية رام' 
  | 'شاشات';

export type GeneralMaintenanceSubType = 
  | 'أجهزة' 
  | 'شبكة' 
  | 'شاشات' 
  | 'تنظيم' 
  | 'تحديث' 
  | 'تنشيط';

export type ReplacementSubType = 
  | 'أجهزة' 
  | 'شاشات' 
  | 'ماوسات' 
  | 'كيبوردات';

export interface DeviceSpec {
  nameOrBrand?: string;
  ram?: string;
  storage?: string;
}

export interface RoomNote {
  id: string;
  text: string;
  date: string;
  createdAt: string;
}

export interface Building {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Room {
  id: string;
  buildingId: string;
  name: string;
  screenStatus: ScreenStatus;
  notes?: string;
  roomNotes: RoomNote[];
  createdAt: string;
}

export interface MaintenanceLog {
  id: string;
  roomId: string;
  category: OperationCategory;
  
  // General Maintenance SubType
  generalSubType?: GeneralMaintenanceSubType;
  
  // Replacement SubType
  replacementSubType?: ReplacementSubType;
  
  // Counts & Device Brands
  devicesCount?: number;     // كم جهاز تم صيانته / ترقيته / تحديثه
  itemsCount?: number;       // عدد القطع (ماوسات، كيبوردات، شاشات)
  deviceBrand?: string;      // فراغ صغير: Dell, HP, إلخ
  
  // Replacement Details (Old vs New)
  oldDevice?: DeviceSpec;
  newDevice?: DeviceSpec;
  
  // RAM Upgrade Specs
  previousRam?: string;
  newRam?: string;
  
  // General text & Executor
  actionDetails?: string;    // تفاصيل العمل المنجز (اختياري)
  executorName?: string;     // اسم المنفذ (اختياري)
  date: string;              // تاريخ الإجراء (YYYY-MM-DD)
  createdAt: string;

  // Legacy compatibility fields if any
  actionType?: string;
  technicianName?: string;
  assetTag?: string;
}

export interface SystemStats {
  totalOperations: number;
  devicesMaintained: number; // كم جهاز تم صيانته بشكل عام
  devicesUpgraded: number;   // كم جهاز تم ترقيته
  devicesUpdated: number;    // كم جهاز تحدّث
  devicesReplaced: number;   // كم جهاز تم استبداله
  itemsReplaced: number;     // كم قطعة استبدلت (ماوسات، كيبوردات، شاشات)
  screensCount: number;      // عمليات الشاشات
  totalRooms: number;
  totalBuildings: number;
}
