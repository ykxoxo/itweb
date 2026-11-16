import * as XLSX from 'xlsx';
import type { Building, MaintenanceLog, Room, RoomVisit } from '../types';
import { aggregateReportData, getLogSubAndSpecs } from './reportAggregator';

export interface ExportExcelOptions {
  buildings: Building[];
  rooms: Room[];
  logs: MaintenanceLog[];
  visits: RoomVisit[];
  periodLabel?: string;
  fileNamePrefix?: string;
  writeFile?: boolean;
  filters?: {
    buildingId?: string;
    roomId?: string;
    dateFrom?: string;
    dateTo?: string;
    includeExplicitVisits?: boolean;
  };
}

export interface ExportExcelResult {
  workbook: XLSX.WorkBook;
  fileName: string;
  base64Data?: string;
}

/**
 * Generates a comprehensive multi-sheet Excel workbook containing:
 * 1) Overall Outputs & Assets KPIs
 * 2) Building-level Summary & Visits
 * 3) Room-level Summary, Visits & Device Status
 * 4) Detailed Maintenance Operations Log
 * 5) Deduplicated Field Visits Timeline
 */
export function exportComprehensiveReportToExcel({
  buildings,
  rooms,
  logs,
  visits,
  periodLabel = 'التقرير الشامل لكافة الفترات',
  fileNamePrefix = 'تقرير_المخرجات_الشامل',
  writeFile = true,
  filters,
}: ExportExcelOptions): ExportExcelResult {
  const report = aggregateReportData({
    buildings,
    rooms,
    logs,
    visits,
    filters,
  });

  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const buildingMap = new Map(buildings.map((b) => [b.id, b.name]));
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Overall Executive Outputs Summary
  const summaryRows = [
    { 'المؤشر / المخرج الفني': 'نطاق التقرير', 'القيمة / الإجمالي': periodLabel, 'الوحدة / التفاصيل': '' },
    {
      'المؤشر / المخرج الفني': 'تاريخ استخراج التقرير',
      'القيمة / الإجمالي': new Date().toISOString().split('T')[0],
      'الوحدة / التفاصيل': 'توقيت النظام المحلي',
    },
    {
      'المؤشر / المخرج الفني': 'إجمالي العمليات الفنية المنفذة',
      'القيمة / الإجمالي': report.outputs.totalOperations,
      'الوحدة / التفاصيل': 'عملية مسجلة',
    },
    {
      'المؤشر / المخرج الفني': 'أجهزة تمت صيانتها',
      'القيمة / الإجمالي': report.outputs.devicesMaintained,
      'الوحدة / التفاصيل': 'جهاز (صيانة عامة)',
    },
    {
      'المؤشر / المخرج الفني': 'أجهزة تم تحديثها',
      'القيمة / الإجمالي': report.outputs.devicesUpdated,
      'الوحدة / التفاصيل': 'جهاز محدث',
    },
    {
      'المؤشر / المخرج الفني': 'أجهزة تمت ترقيتها (رام RAM)',
      'القيمة / الإجمالي': report.outputs.devicesUpgraded,
      'الوحدة / التفاصيل': 'جهاز مرقى',
    },
    {
      'المؤشر / المخرج الفني': 'هاردسكات تم تبديلها (SSD / HDD)',
      'القيمة / الإجمالي': report.outputs.hardDrivesReplaced,
      'الوحدة / التفاصيل': 'هاردسك / جهاز',
    },
    {
      'المؤشر / المخرج الفني': 'باور سبلاي تم تبديله (Power Supply)',
      'القيمة / الإجمالي': report.outputs.powerSuppliesReplaced,
      'الوحدة / التفاصيل': 'وحدة / جهاز',
    },
    {
      'المؤشر / المخرج الفني': 'شاشات تم تبديلها أو تركيبها',
      'القيمة / الإجمالي': report.outputs.screensReplaced,
      'الوحدة / التفاصيل': `بالإضافة إلى (${report.outputs.screensMaintained}) صيانة شاشة`,
    },
    {
      'المؤشر / المخرج الفني': 'أجهزة كاملة تم استبدالها',
      'القيمة / الإجمالي': report.outputs.devicesReplaced,
      'الوحدة / التفاصيل': 'جهاز مستبدل',
    },
    {
      'المؤشر / المخرج الفني': 'ملحقات مستبدلة (ماوسات / كيبوردات)',
      'القيمة / الإجمالي': report.outputs.itemsReplaced,
      'الوحدة / التفاصيل': `ماوسات: ${report.outputs.miceReplaced} • كيبوردات: ${report.outputs.keyboardsReplaced}`,
    },
    {
      'المؤشر / المخرج الفني': 'إجمالي زيارات القاعات (لكل قاعة يوم = زيارة)',
      'القيمة / الإجمالي': report.totalRoomVisits,
      'الوحدة / التفاصيل': 'زيارة قاعة',
    },
    {
      'المؤشر / المخرج الفني': 'إجمالي أيام الزيارة الميدانية للمباني',
      'القيمة / الإجمالي': report.totalBuildingVisitDays,
      'الوحدة / التفاصيل': 'يوم تواجد بالمباني',
    },
    {
      'المؤشر / المخرج الفني': 'إجمالي الأجهزة المثبتة حالياً بالقاعات',
      'القيمة / الإجمالي': report.assets.totalInstalledDevices,
      'الوحدة / التفاصيل': `جاهز: ${report.assets.devicesReadyCount} • يحتاج صيانة: ${report.assets.devicesNeedMaintenanceCount} • لم يُعمل عليه: ${report.assets.devicesUntouchedCount} (${report.assets.readinessPercent}% جاهزية)`,
    },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 42 }, { wch: 24 }, { wch: 52 }];
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'ملخص المخرجات العام');

  // Sheet 2: Building Summary & Visits
  const buildingRows = report.byBuilding.map((b, idx) => ({
    'م': idx + 1,
    'المبنى': b.building.name,
    'عدد القاعات': b.roomsCount,
    'إجمالي الأجهزة': b.assets.totalInstalledDevices,
    'نسبة الجاهزية %': `${b.assets.readinessPercent}%`,
    'أيام زيارة المبنى': b.visitDaysCount,
    'إجمالي زيارات القاعات': b.roomVisitsTotal,
    'آخر زيارة للمبنى': b.lastVisitDate || '-',
    'العمليات المنفذة': b.outputs.totalOperations,
    'أجهزة مصانة': b.outputs.devicesMaintained,
    'أجهزة محدثة': b.outputs.devicesUpdated,
    'ترقية رام': b.outputs.devicesUpgraded,
    'تبديل هاردسك': b.outputs.hardDrivesReplaced,
    'تبديل باور': b.outputs.powerSuppliesReplaced,
    'شاشات مستبدلة': b.outputs.screensReplaced,
    'أجهزة مستبدلة': b.outputs.devicesReplaced,
    'ملحقات مستبدلة': b.outputs.itemsReplaced,
  }));
  const wsBuildings = XLSX.utils.json_to_sheet(
    buildingRows.length > 0 ? buildingRows : [{ 'ملاحظة': 'لا توجد مبانٍ ضمن نطاق الفلتر' }]
  );
  wsBuildings['!cols'] = [
    { wch: 5 },
    { wch: 24 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsBuildings, 'ملخص المباني والزيارات');

  // Sheet 3: Room Summary, Visits & Outputs
  const roomRows = report.byRoom.map((r, idx) => ({
    'م': idx + 1,
    'المبنى': r.buildingName,
    'القاعة': r.room.name,
    'حالة شاشة القاعة': r.room.screenStatus,
    'إجمالي الأجهزة': r.assets.totalInstalledDevices,
    'جاهز / محدث': r.assets.devicesReadyCount,
    'يحتاج صيانة': r.assets.devicesNeedMaintenanceCount,
    'لم يُعمل عليه': r.assets.devicesUntouchedCount,
    'عدد الزيارات': r.visitsCount,
    'آخر زيارة': r.lastVisitDate || '-',
    'عدد العمليات': r.outputs.totalOperations,
    'أجهزة مصانة': r.outputs.devicesMaintained,
    'أجهزة محدثة': r.outputs.devicesUpdated,
    'ترقية رام': r.outputs.devicesUpgraded,
    'تبديل هاردسك': r.outputs.hardDrivesReplaced,
    'تبديل باور': r.outputs.powerSuppliesReplaced,
    'شاشات مستبدلة': r.outputs.screensReplaced,
    'أجهزة مستبدلة': r.outputs.devicesReplaced,
    'ملحقات مستبدلة': r.outputs.itemsReplaced,
  }));
  const wsRooms = XLSX.utils.json_to_sheet(
    roomRows.length > 0 ? roomRows : [{ 'ملاحظة': 'لا توجد قاعات ضمن نطاق الفلتر' }]
  );
  wsRooms['!cols'] = [
    { wch: 5 },
    { wch: 20 },
    { wch: 24 },
    { wch: 16 },
    { wch: 14 },
    { wch: 13 },
    { wch: 12 },
    { wch: 13 },
    { wch: 13 },
    { wch: 14 },
    { wch: 13 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsRooms, 'القاعات والزيارات');

  // Sheet 4: Detailed Maintenance Operations Log
  const logRows = report.scopedLogs.map((log, index) => {
    const room = roomMap.get(log.roomId);
    const buildingName = room?.buildingId ? buildingMap.get(room.buildingId) || '-' : '-';
    const { subAndCount, specs } = getLogSubAndSpecs(log);

    return {
      'م': index + 1,
      'تاريخ الإجراء': log.date,
      'المبنى': buildingName,
      'القاعة': room?.name || 'غير محدد',
      'نوع العملية': log.category,
      'التصنيف والعدد': subAndCount,
      'المواصفات / الماركة': specs || '-',
      'الأجهزة المشمولة': log.deviceTags?.length ? log.deviceTags.join(', ') : '-',
      'تفاصيل العمل المنجز': log.actionDetails || '-',
      'اسم المنفذ': log.executorName || 'غير محدد',
    };
  });
  const wsLogs = XLSX.utils.json_to_sheet(
    logRows.length > 0 ? logRows : [{ 'ملاحظة': 'لا توجد عمليات مسجلة خلال هذه الفترة' }]
  );
  wsLogs['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 22 },
    { wch: 26 },
    { wch: 18 },
    { wch: 24 },
    { wch: 32 },
    { wch: 28 },
    { wch: 44 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsLogs, 'سجل العمليات التفصيلي');

  // Sheet 5: Effective Visits Log
  const visitRows = report.effectiveVisits.map((v, idx) => ({
    'م': idx + 1,
    'تاريخ الزيارة': v.date,
    'المبنى': v.buildingName,
    'القاعة': v.roomName,
    'تصنيف الزيارة': v.source,
    'الغرض': v.purpose,
    'العمليات المنفذة بالزيارة': v.operationsCount,
    'الفني / الزائر': v.executors.join('، ') || '-',
    'ملخص الأعمال / الملاحظات': v.notes,
  }));
  const wsVisits = XLSX.utils.json_to_sheet(
    visitRows.length > 0 ? visitRows : [{ 'ملاحظة': 'لا توجد زيارات مسجلة خلال هذه الفترة' }]
  );
  wsVisits['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 22 },
    { wch: 24 },
    { wch: 22 },
    { wch: 18 },
    { wch: 20 },
    { wch: 24 },
    { wch: 48 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsVisits, 'سجل الزيارات الميدانية');

  const today = new Date().toISOString().split('T')[0];
  const fileName = `${fileNamePrefix}_${today}.xlsx`;

  if (writeFile) {
    XLSX.writeFile(workbook, fileName);
    return { workbook, fileName };
  }

  const base64Data = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  return { workbook, fileName, base64Data };
}

