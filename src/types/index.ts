export type ScreenStatus = 
  | 'تعمل بامتياز' 
  | 'تحتاج صيانة' 
  | 'مكسورة' 
  | 'لا توجد شاشة';

export type OperationCategory = 
  | 'صيانة عامة' 
  | 'استبدال' 
  | 'ترقية رام' 
  | 'تبديل هاردسك'
  | 'تبديل باور سبلاي'
  | 'شاشات';

export type GeneralMaintenanceSubType = 
  | 'أجهزة' 
  | 'هاردسكات'
  | 'باور سبلاي'
  | 'شبكة' 
  | 'شاشات' 
  | 'تنظيم' 
  | 'تحديث' 
  | 'تنشيط';

export type ReplacementSubType = 
  | 'أجهزة' 
  | 'هاردسكات'
  | 'باور سبلاي'
  | 'شاشات' 
  | 'ماوسات' 
  | 'كيبوردات';

export interface DeviceSpec {
  nameOrBrand?: string;
  ram?: string;
  storage?: string;
  powerSupply?: string;
}

export interface DeviceNote {
  id: string;
  text: string;
  date: string;
  createdAt: string;
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

export type DeviceStatus = 
  | 'تم تحديثه' 
  | 'يحتاج صيانة' 
  | 'لم يتم العمل عليه';

export type RoomLayoutType = 
  | 'u-shape' 
  | 'two-rows' 
  | 'four-rows';

export interface RoomDevice {
  id: string;
  tag: string;
  status: DeviceStatus;
  brand?: string;
  ram?: string;
  storage?: string; // سعة ونوع الهاردسك (مثل 512GB SSD)
  powerSupply?: string; // حالة ونوع الباور سبلاي (مثل 500W أصلي أو تم استبداله)
  notes?: string;
  deviceNotes?: DeviceNote[]; // سجل الملاحظات المتعددة الخاص بكل جهاز
  lastMaintenanceDate?: string;
}

export interface Room {
  id: string;
  buildingId: string;
  name: string;
  screenStatus: ScreenStatus;
  notes?: string;
  roomNotes: RoomNote[];
  layoutType: RoomLayoutType;
  totalDevices: number;
  devices: RoomDevice[];
  instructorDevice?: RoomDevice; // جهاز مكتب المدرب الخاص بالقاعة
  skipAutoInstructorDevice?: boolean; // عند استيراد قاعة بجهاز واحد فقط من Excel
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

  // Storage & Power Supply Specs
  hardDrive?: string;
  powerSupply?: string;
  
  // Specific device tags if linked to visual map
  deviceTags?: string[];
  
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

export type VisitPurpose =
  | 'صيانة وتنفيذ'
  | 'جولة تفقدية'
  | 'بلاغ طارئ'
  | 'تجهيز ومتابعة';

export interface RoomVisit {
  id: string;
  roomId: string;
  date: string;         // تاريخ الزيارة (YYYY-MM-DD)
  visitorName?: string; // اسم الفني / الزائر
  purpose: VisitPurpose;
  notes?: string;
  createdAt: string;
}

export interface OutputCounters {
  totalOperations: number;
  devicesMaintained: number;     // أجهزة تمت صيانتها
  devicesUpdated: number;        // أجهزة تم تحديثها
  devicesUpgraded: number;       // أجهزة تمت ترقيتها (رام)
  hardDrivesReplaced: number;    // هاردسكات تم تبديلها
  powerSuppliesReplaced: number; // باور سبلاي تم تبديله
  devicesReplaced: number;       // أجهزة كاملة مستبدلة
  screensReplaced: number;       // شاشات تم تبديلها أو تركيبها
  screensMaintained: number;     // صيانة شاشات
  screensCount: number;          // إجمالي عمليات الشاشات
  miceReplaced: number;          // ماوسات مستبدلة
  keyboardsReplaced: number;     // كيبوردات مستبدلة
  itemsReplaced: number;         // إجمالي الملحقات المستبدلة (ماوسات + كيبوردات + أخرى)
}

export interface AssetsSnapshot {
  totalInstalledDevices: number;
  devicesReadyCount: number;
  devicesNeedMaintenanceCount: number;
  devicesUntouchedCount: number;
  readinessPercent: number;
}

export interface EffectiveVisitRecord {
  id: string;
  roomId: string;
  roomName: string;
  buildingId: string;
  buildingName: string;
  date: string;
  source: 'صيانة وتنفيذ' | 'جولة تفقدية' | 'مشترك (صيانة + تفقد)';
  purpose: VisitPurpose;
  operationsCount: number;
  executors: string[];
  notes: string;
  explicitVisitIds: string[];
}

export interface RoomReportSummary {
  room: Room;
  buildingId: string;
  buildingName: string;
  visitsCount: number;
  explicitVisitsCount: number;
  lastVisitDate: string | null;
  outputs: OutputCounters;
  assets: AssetsSnapshot;
}

export interface BuildingReportSummary {
  building: Building;
  roomsCount: number;
  visitDaysCount: number;   // عدد أيام الزيارة الفريدة للمبنى
  roomVisitsTotal: number;  // مجموع زيارات القاعات داخل المبنى
  lastVisitDate: string | null;
  screensWorkingCount: number;
  screensNeedsAttentionCount: number;
  outputs: OutputCounters;
  assets: AssetsSnapshot;
}

export interface SystemStats extends OutputCounters, AssetsSnapshot {
  totalRoomVisits: number;        // مجموع زيارات القاعات (لكل قاعة يوم فريد = زيارة)
  totalBuildingVisitDays: number; // مجموع أيام الزيارة الميدانية للمباني
  totalRooms: number;
  totalBuildings: number;
}
