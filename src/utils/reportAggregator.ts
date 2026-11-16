import type {
  AssetsSnapshot,
  Building,
  BuildingReportSummary,
  EffectiveVisitRecord,
  MaintenanceLog,
  OperationCategory,
  OutputCounters,
  Room,
  RoomReportSummary,
  RoomVisit,
  SystemStats,
  VisitPurpose,
} from '../types';

export function createEmptyOutputs(): OutputCounters {
  return {
    totalOperations: 0,
    devicesMaintained: 0,
    devicesUpdated: 0,
    devicesUpgraded: 0,
    hardDrivesReplaced: 0,
    powerSuppliesReplaced: 0,
    devicesReplaced: 0,
    screensReplaced: 0,
    screensMaintained: 0,
    screensCount: 0,
    miceReplaced: 0,
    keyboardsReplaced: 0,
    itemsReplaced: 0,
  };
}

/**
 * Formats subtype/count and hardware specs uniformly across Dashboard, Reports, RoomModal, Print, and Excel.
 */
export function getLogSubAndSpecs(log: MaintenanceLog): { subAndCount: string; specs: string } {
  let subAndCount = '-';
  const countNum = log.devicesCount || log.itemsCount;

  if (log.category === 'صيانة عامة') {
    if (log.generalSubType) {
      subAndCount = `${log.generalSubType}${log.devicesCount ? ` (${log.devicesCount} جهاز)` : ''}`;
    } else if (log.devicesCount) {
      subAndCount = `صيانة (${log.devicesCount} جهاز)`;
    }
  } else if (log.category === 'استبدال') {
    if (log.replacementSubType) {
      const unit = log.replacementSubType === 'أجهزة' ? 'جهاز' : 'قطعة';
      subAndCount = `استبدال ${log.replacementSubType}${countNum ? ` (${countNum} ${unit})` : ''}`;
    } else if (countNum) {
      subAndCount = `استبدال (${countNum})`;
    }
  } else if (log.category === 'ترقية رام') {
    subAndCount = log.devicesCount ? `ترقية ${log.devicesCount} جهاز` : 'ترقية رام';
  } else if (log.category === 'تبديل هاردسك') {
    subAndCount = countNum ? `تبديل هاردسك (${countNum} جهاز)` : 'تبديل هاردسك';
  } else if (log.category === 'تبديل باور سبلاي') {
    subAndCount = countNum ? `تبديل باور (${countNum} جهاز)` : 'تبديل باور سبلاي';
  } else if (log.category === 'شاشات') {
    subAndCount = countNum ? `${countNum} شاشة` : 'شاشات';
  }

  let specs = log.deviceBrand || '';
  if (log.category === 'استبدال' && log.oldDevice && log.newDevice) {
    specs = `${log.oldDevice.nameOrBrand || ''} ⬅ ${log.newDevice.nameOrBrand || ''}`;
  } else if (log.category === 'ترقية رام' && (log.previousRam || log.newRam)) {
    const ramChange = `${log.previousRam ? `${log.previousRam} ⬅ ` : ''}${log.newRam || ''}`;
    specs = log.deviceBrand ? `${log.deviceBrand} (${ramChange})` : ramChange;
  } else if ((log.category === 'تبديل هاردسك' || log.replacementSubType === 'هاردسكات') && log.hardDrive) {
    specs = log.deviceBrand ? `${log.deviceBrand} • ${log.hardDrive}` : log.hardDrive;
  } else if ((log.category === 'تبديل باور سبلاي' || log.replacementSubType === 'باور سبلاي') && log.powerSupply) {
    specs = log.deviceBrand ? `${log.deviceBrand} • ${log.powerSupply}` : log.powerSupply;
  }

  return { subAndCount, specs };
}

/**
 * Accumulates a single MaintenanceLog into an OutputCounters bucket without double counting.
 */
export function accumulateLogIntoOutputs(target: OutputCounters, log: MaintenanceLog): void {
  const rawDevicesCount = Number(log.devicesCount) || 0;
  const rawItemsCount = Number(log.itemsCount) || 0;
  const itemOrDeviceCount = rawItemsCount || rawDevicesCount || 1;
  const deviceCount = rawDevicesCount || 1;

  target.totalOperations += 1;

  if (log.category === 'ترقية رام') {
    target.devicesUpgraded += deviceCount;
    return;
  }

  if (log.category === 'تبديل هاردسك') {
    target.hardDrivesReplaced += itemOrDeviceCount;
    return;
  }

  if (log.category === 'تبديل باور سبلاي') {
    target.powerSuppliesReplaced += itemOrDeviceCount;
    return;
  }

  if (log.category === 'شاشات') {
    target.screensReplaced += itemOrDeviceCount;
    target.screensCount += itemOrDeviceCount;
    return;
  }

  if (log.category === 'استبدال') {
    if (log.replacementSubType === 'أجهزة') {
      target.devicesReplaced += deviceCount;
    } else if (log.replacementSubType === 'هاردسكات') {
      target.hardDrivesReplaced += itemOrDeviceCount;
    } else if (log.replacementSubType === 'باور سبلاي') {
      target.powerSuppliesReplaced += itemOrDeviceCount;
    } else if (log.replacementSubType === 'شاشات') {
      target.screensReplaced += itemOrDeviceCount;
      target.screensCount += itemOrDeviceCount;
    } else if (log.replacementSubType === 'ماوسات') {
      target.miceReplaced += itemOrDeviceCount;
      target.itemsReplaced += itemOrDeviceCount;
    } else if (log.replacementSubType === 'كيبوردات') {
      target.keyboardsReplaced += itemOrDeviceCount;
      target.itemsReplaced += itemOrDeviceCount;
    } else {
      target.itemsReplaced += itemOrDeviceCount;
    }
    return;
  }

  // 'صيانة عامة'
  if (log.generalSubType === 'تحديث') {
    target.devicesUpdated += deviceCount;
  } else if (log.generalSubType === 'شاشات') {
    target.screensMaintained += itemOrDeviceCount;
    target.screensCount += itemOrDeviceCount;
  } else if (log.generalSubType === 'شبكة' || log.generalSubType === 'تنظيم') {
    // Room-level network/organization tasks without an explicit devicesCount count as an operation only
    if (rawDevicesCount > 0) {
      target.devicesMaintained += rawDevicesCount;
    }
  } else {
    target.devicesMaintained += deviceCount;
  }
}

export function computeAssetsSnapshot(targetRooms: Room[]): AssetsSnapshot {
  let totalInstalledDevices = 0;
  let devicesReadyCount = 0;
  let devicesNeedMaintenanceCount = 0;
  let devicesUntouchedCount = 0;

  for (const room of targetRooms) {
    const baseDevs = room.devices || [];
    const devs = room.instructorDevice ? [...baseDevs, room.instructorDevice] : baseDevs;
    const total = devs.length || Number(room.totalDevices) || 0;
    totalInstalledDevices += total;

    if (devs.length > 0) {
      for (const dev of devs) {
        if (dev.status === 'تم تحديثه') devicesReadyCount += 1;
        else if (dev.status === 'يحتاج صيانة') devicesNeedMaintenanceCount += 1;
        else devicesUntouchedCount += 1;
      }
    } else {
      devicesUntouchedCount += total;
    }
  }

  const readinessPercent =
    totalInstalledDevices > 0 ? Math.round((devicesReadyCount / totalInstalledDevices) * 100) : 0;

  return {
    totalInstalledDevices,
    devicesReadyCount,
    devicesNeedMaintenanceCount,
    devicesUntouchedCount,
    readinessPercent,
  };
}

export interface AggregateReportParams {
  buildings: Building[];
  rooms: Room[];
  logs: MaintenanceLog[];
  visits: RoomVisit[];
  filters?: {
    buildingId?: string;
    roomId?: string;
    dateFrom?: string;
    dateTo?: string;
    includeExplicitVisits?: boolean;
  };
}

export interface AggregatedReport {
  outputs: OutputCounters;
  assets: AssetsSnapshot;
  effectiveVisits: EffectiveVisitRecord[];
  totalRoomVisits: number;
  totalBuildingVisitDays: number;
  byRoom: RoomReportSummary[];
  byBuilding: BuildingReportSummary[];
  scopedLogs: MaintenanceLog[];
  scopedVisits: RoomVisit[];
}

function isDateWithinRange(dateStr: string | undefined, dateFrom?: string, dateTo?: string): boolean {
  if (!dateStr) return !dateFrom && !dateTo;
  const normalized = dateStr.slice(0, 10);
  if (dateFrom && normalized < dateFrom) return false;
  if (dateTo && normalized > dateTo) return false;
  return true;
}

/**
 * Computes unified hardware outputs, live asset status, and deduplicated room/building visit metrics.
 * Rule for visits: each unique (roomId, date) pair counts as 1 visit to that room;
 * building visit days count unique (buildingId, date) pairs.
 */
export function aggregateReportData({
  buildings,
  rooms,
  logs,
  visits,
  filters,
}: AggregateReportParams): AggregatedReport {
  const buildingIdFilter = filters?.buildingId && filters.buildingId !== 'all' ? filters.buildingId : undefined;
  const roomIdFilter = filters?.roomId && filters.roomId !== 'all' ? filters.roomId : undefined;
  const dateFrom = filters?.dateFrom || undefined;
  const dateTo = filters?.dateTo || undefined;
  const includeExplicitVisits = filters?.includeExplicitVisits !== false;

  const buildingMap = new Map(buildings.map((b) => [b.id, b]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  const scopedRooms = rooms.filter((r) => {
    if (roomIdFilter && r.id !== roomIdFilter) return false;
    if (buildingIdFilter && r.buildingId !== buildingIdFilter) return false;
    return true;
  });

  const scopedRoomIds = new Set(scopedRooms.map((r) => r.id));

  const scopedBuildings = buildings.filter((b) => {
    if (buildingIdFilter && b.id !== buildingIdFilter) return false;
    if (roomIdFilter) {
      const targetRoom = roomMap.get(roomIdFilter);
      return targetRoom ? targetRoom.buildingId === b.id : false;
    }
    return true;
  });

  const scopedLogs = logs.filter(
    (l) => scopedRoomIds.has(l.roomId) && isDateWithinRange(l.date, dateFrom, dateTo)
  );

  const scopedVisits = includeExplicitVisits
    ? visits.filter((v) => scopedRoomIds.has(v.roomId) && isDateWithinRange(v.date, dateFrom, dateTo))
    : [];

  // 1. Overall Outputs & Assets
  const overallOutputs = createEmptyOutputs();
  const roomOutputsMap = new Map<string, OutputCounters>();

  for (const r of scopedRooms) {
    roomOutputsMap.set(r.id, createEmptyOutputs());
  }

  for (const log of scopedLogs) {
    accumulateLogIntoOutputs(overallOutputs, log);
    const roomBucket = roomOutputsMap.get(log.roomId);
    if (roomBucket) {
      accumulateLogIntoOutputs(roomBucket, log);
    }
  }

  const overallAssets = computeAssetsSnapshot(scopedRooms);

  // 2. Build Deduplicated Visits by (roomId + date)
  interface VisitAccumulator {
    roomId: string;
    date: string;
    operationsCount: number;
    explicitVisits: RoomVisit[];
    executorsSet: Set<string>;
    notesList: string[];
  }

  const visitBuckets = new Map<string, VisitAccumulator>();

  const ensureBucket = (roomId: string, date: string): VisitAccumulator => {
    const cleanDate = (date || '').slice(0, 10) || 'غير محدد';
    const key = `${roomId}__${cleanDate}`;
    let existing = visitBuckets.get(key);
    if (!existing) {
      existing = {
        roomId,
        date: cleanDate,
        operationsCount: 0,
        explicitVisits: [],
        executorsSet: new Set<string>(),
        notesList: [],
      };
      visitBuckets.set(key, existing);
    }
    return existing;
  };

  for (const log of scopedLogs) {
    const bucket = ensureBucket(log.roomId, log.date);
    bucket.operationsCount += 1;
    if (log.executorName?.trim()) {
      bucket.executorsSet.add(log.executorName.trim());
    }
    const summaryText = log.actionDetails?.trim() || `${log.category}`;
    if (summaryText && bucket.notesList.length < 4 && !bucket.notesList.includes(summaryText)) {
      bucket.notesList.push(summaryText);
    }
  }

  for (const visit of scopedVisits) {
    const bucket = ensureBucket(visit.roomId, visit.date);
    bucket.explicitVisits.push(visit);
    if (visit.visitorName?.trim()) {
      bucket.executorsSet.add(visit.visitorName.trim());
    }
    if (visit.notes?.trim() && !bucket.notesList.includes(visit.notes.trim())) {
      bucket.notesList.unshift(visit.notes.trim());
    }
  }

  const effectiveVisits: EffectiveVisitRecord[] = Array.from(visitBuckets.entries())
    .map(([key, bucket]) => {
      const room = roomMap.get(bucket.roomId);
      const building = room ? buildingMap.get(room.buildingId) : undefined;
      const hasLogs = bucket.operationsCount > 0;
      const hasExplicit = bucket.explicitVisits.length > 0;

      const source: EffectiveVisitRecord['source'] =
        hasLogs && hasExplicit
          ? 'مشترك (صيانة + تفقد)'
          : hasExplicit
          ? 'جولة تفقدية'
          : 'صيانة وتنفيذ';

      const primaryPurpose: VisitPurpose = hasExplicit
        ? bucket.explicitVisits[0].purpose
        : 'صيانة وتنفيذ';

      return {
        id: hasExplicit ? bucket.explicitVisits[0].id : `auto-${key}`,
        roomId: bucket.roomId,
        roomName: room?.name || 'غير محدد',
        buildingId: room?.buildingId || '',
        buildingName: building?.name || 'غير محدد',
        date: bucket.date,
        source,
        purpose: primaryPurpose,
        operationsCount: bucket.operationsCount,
        executors: Array.from(bucket.executorsSet),
        notes: bucket.notesList.join(' • ') || '-',
        explicitVisitIds: bucket.explicitVisits.map((v) => v.id),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  // 3. Per-Room Summaries
  const byRoom: RoomReportSummary[] = scopedRooms.map((room) => {
    const building = buildingMap.get(room.buildingId);
    const roomEffectiveVisits = effectiveVisits.filter((v) => v.roomId === room.id);
    const roomExplicitVisits = scopedVisits.filter((v) => v.roomId === room.id);

    return {
      room,
      buildingId: room.buildingId,
      buildingName: building?.name || 'غير محدد',
      visitsCount: roomEffectiveVisits.length,
      explicitVisitsCount: roomExplicitVisits.length,
      lastVisitDate: roomEffectiveVisits.length > 0 ? roomEffectiveVisits[0].date : null,
      outputs: roomOutputsMap.get(room.id) || createEmptyOutputs(),
      assets: computeAssetsSnapshot([room]),
    };
  });

  // 4. Per-Building Summaries
  const byBuilding: BuildingReportSummary[] = scopedBuildings.map((building) => {
    const bRoomsSummary = byRoom.filter((rs) => rs.buildingId === building.id);
    const bRooms = bRoomsSummary.map((rs) => rs.room);
    const bOutputs = createEmptyOutputs();
    const bVisitDates = new Set<string>();
    let roomVisitsTotal = 0;

    for (const rs of bRoomsSummary) {
      roomVisitsTotal += rs.visitsCount;
      bOutputs.totalOperations += rs.outputs.totalOperations;
      bOutputs.devicesMaintained += rs.outputs.devicesMaintained;
      bOutputs.devicesUpdated += rs.outputs.devicesUpdated;
      bOutputs.devicesUpgraded += rs.outputs.devicesUpgraded;
      bOutputs.hardDrivesReplaced += rs.outputs.hardDrivesReplaced;
      bOutputs.powerSuppliesReplaced += rs.outputs.powerSuppliesReplaced;
      bOutputs.devicesReplaced += rs.outputs.devicesReplaced;
      bOutputs.screensReplaced += rs.outputs.screensReplaced;
      bOutputs.screensMaintained += rs.outputs.screensMaintained;
      bOutputs.screensCount += rs.outputs.screensCount;
      bOutputs.miceReplaced += rs.outputs.miceReplaced;
      bOutputs.keyboardsReplaced += rs.outputs.keyboardsReplaced;
      bOutputs.itemsReplaced += rs.outputs.itemsReplaced;
    }

    for (const ev of effectiveVisits) {
      if (ev.buildingId === building.id && ev.date !== 'غير محدد') {
        bVisitDates.add(ev.date);
      }
    }

    const sortedDates = Array.from(bVisitDates).sort((a, b) => b.localeCompare(a));

    return {
      building,
      roomsCount: bRooms.length,
      visitDaysCount: bVisitDates.size,
      roomVisitsTotal,
      lastVisitDate: sortedDates[0] || null,
      screensWorkingCount: bRooms.filter((r) => r.screenStatus === 'تعمل بامتياز').length,
      screensNeedsAttentionCount: bRooms.filter(
        (r) => r.screenStatus === 'تحتاج صيانة' || r.screenStatus === 'مكسورة'
      ).length,
      outputs: bOutputs,
      assets: computeAssetsSnapshot(bRooms),
    };
  });

  const totalBuildingVisitDays = byBuilding.reduce((sum, b) => sum + b.visitDaysCount, 0);

  return {
    outputs: overallOutputs,
    assets: overallAssets,
    effectiveVisits,
    totalRoomVisits: effectiveVisits.length,
    totalBuildingVisitDays,
    byRoom,
    byBuilding,
    scopedLogs,
    scopedVisits,
  };
}

export function computeSystemStats(
  buildings: Building[],
  rooms: Room[],
  logs: MaintenanceLog[],
  visits: RoomVisit[]
): SystemStats {
  const report = aggregateReportData({ buildings, rooms, logs, visits });
  return {
    ...report.outputs,
    ...report.assets,
    totalRoomVisits: report.totalRoomVisits,
    totalBuildingVisitDays: report.totalBuildingVisitDays,
    totalRooms: rooms.length,
    totalBuildings: buildings.length,
  };
}

/**
 * Synchronizes devicesCount/itemsCount cleanly during inline log edits so itemsCount
 * from item-based logs (screens/peripherals) never shadows an edited count.
 */
export function buildCountUpdateFields(
  log: MaintenanceLog | undefined,
  category: OperationCategory,
  count: number | undefined
): Pick<MaintenanceLog, 'devicesCount' | 'itemsCount'> {
  const isItemCategory =
    category === 'شاشات' ||
    (category === 'استبدال' && log?.replacementSubType !== 'أجهزة');

  if (isItemCategory || log?.itemsCount !== undefined) {
    return {
      itemsCount: count,
      devicesCount: category === 'شاشات' ? count : log?.devicesCount !== undefined ? count : undefined,
    };
  }

  return {
    devicesCount: count,
    itemsCount: undefined,
  };
}

