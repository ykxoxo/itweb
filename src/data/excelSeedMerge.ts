import type { Building, DeviceStatus, Room, RoomDevice, RoomVisit } from '../types';
import { EXCEL_SEED_BUILDINGS, type ExcelSeedBuildingEntry } from './excelSeedData';
import {
  normalizeArabicForMatch,
  normalizeBuildingMatchKey,
} from '../utils/excelLocationImporter';

export const EXCEL_SEED_FLAG_KEY = 'it_hub_excel_seed_v1';

function buildBuildingAliasSet(seedBldg: ExcelSeedBuildingEntry): Set<string> {
  const aliases = new Set<string>();
  aliases.add(normalizeBuildingMatchKey(seedBldg.buildingName));

  const code = normalizeArabicForMatch(seedBldg.buildingCode);
  if (/^\d+$/.test(code)) {
    aliases.add(code);
    aliases.add(`مبني ${code}`);
    aliases.add(`المبني ${code}`);
    aliases.add(`مبني (${code})`);
    if (code === '15' || code === '16') {
      aliases.add(`جنوبي ${code}`);
      aliases.add(`المبني الجنوبي ${code}`);
      aliases.add(`مبني الجنوبي ${code}`);
    }
  } else if (code === normalizeArabicForMatch('العمادة')) {
    aliases.add(normalizeArabicForMatch('العمادة'));
    aliases.add(normalizeArabicForMatch('مبنى العمادة'));
  } else if (code === normalizeArabicForMatch('الصالة')) {
    aliases.add(normalizeArabicForMatch('الصالة'));
    aliases.add(normalizeArabicForMatch('الصالة المتعددة'));
    aliases.add(normalizeArabicForMatch('الصالة المتعددة الأغراض'));
  } else if (code === normalizeArabicForMatch('الورش')) {
    aliases.add(normalizeArabicForMatch('الورش'));
    aliases.add(normalizeArabicForMatch('مبنى الورش'));
    aliases.add(normalizeArabicForMatch('المبنى الجنوبي الورش'));
  }

  return aliases;
}

function findMatchingBuildingIndex(
  buildings: Building[],
  seedBldg: ExcelSeedBuildingEntry
): number {
  const aliases = buildBuildingAliasSet(seedBldg);
  return buildings.findIndex((b) => aliases.has(normalizeBuildingMatchKey(b.name)));
}

function normalizeRoomKeyForMatch(roomName: string): string {
  return normalizeArabicForMatch(roomName)
    .replace(/^(?:قاعه|معمل)\s+(?=\S*-\S*)/, '')
    .trim();
}

export function mergeBuiltinExcelSeedIntoState(
  currentBuildings: Building[],
  currentRooms: Room[],
  currentVisits: RoomVisit[],
  makeId: (prefix: string) => string
): {
  buildings: Building[];
  rooms: Room[];
  visits: RoomVisit[];
  buildingsCreated: number;
  roomsCreated: number;
  roomsIncremented: number;
  visitsAdded: number;
} {
  const nextBuildings: Building[] = [...currentBuildings];
  const nextRooms: Room[] = [...currentRooms];
  const nextVisits: RoomVisit[] = [...currentVisits];

  const existingVisitKeys = new Set<string>(
    nextVisits.map((v) => `${v.roomId}__${(v.date || '').slice(0, 10)}`)
  );
  const usedBuildingIds = new Set<string>(nextBuildings.map((b) => b.id));
  const usedRoomIds = new Set<string>(nextRooms.map((r) => r.id));

  let buildingsCreated = 0;
  let roomsCreated = 0;
  let roomsIncremented = 0;
  let visitsAdded = 0;

  for (const seedBldg of EXCEL_SEED_BUILDINGS) {
    let bldgIdx = findMatchingBuildingIndex(nextBuildings, seedBldg);
    let targetBuilding: Building;

    if (bldgIdx !== -1) {
      targetBuilding = nextBuildings[bldgIdx];
    } else {
      const bId = usedBuildingIds.has(seedBldg.id) ? makeId('bldg-xls') : seedBldg.id;
      usedBuildingIds.add(bId);
      targetBuilding = {
        id: bId,
        name: seedBldg.buildingName,
        description: `مبنى مضاف من جدول الطلبات (${seedBldg.rooms.length} قاعة ومكتب)`,
        createdAt: seedBldg.createdAt,
      };
      nextBuildings.push(targetBuilding);
      bldgIdx = nextBuildings.length - 1;
      buildingsCreated += 1;
    }

    for (const seedRoom of seedBldg.rooms) {
      const seedRoomKey = normalizeRoomKeyForMatch(seedRoom.roomName);
      const roomIdx = nextRooms.findIndex(
        (r) =>
          r.buildingId === targetBuilding.id &&
          normalizeRoomKeyForMatch(r.name) === seedRoomKey
      );

      let targetRoom: Room;

      if (roomIdx !== -1) {
        // Room already exists -> append +1 device ("تزيد جهاز لكل قاعة به كجهاز")
        const existingRoom = nextRooms[roomIdx];
        const existingDevices = Array.isArray(existingRoom.devices) ? existingRoom.devices : [];
        const nextNum = existingDevices.length + 1;
        const addedDevice: RoomDevice = {
          id: `dev-${existingRoom.id}-xls-${nextNum}`,
          tag: `PC-${String(nextNum).padStart(2, '0')}`,
          status: 'لم يتم العمل عليه' as DeviceStatus,
          brand: 'Dell OptiPlex',
          ram: '16GB',
          storage: '512GB SSD',
          powerSupply: 'سليم (500W)',
          deviceNotes: [],
        };
        const updatedDevices = [...existingDevices, addedDevice];
        targetRoom = {
          ...existingRoom,
          devices: updatedDevices,
          totalDevices: updatedDevices.length,
        };
        nextRooms[roomIdx] = targetRoom;
        roomsIncremented += 1;
      } else {
        const rId = usedRoomIds.has(seedRoom.id) ? makeId('room-xls') : seedRoom.id;
        usedRoomIds.add(rId);
        targetRoom = {
          id: rId,
          buildingId: targetBuilding.id,
          name: seedRoom.roomName,
          screenStatus: 'تعمل بامتياز',
          roomNotes: [],
          layoutType: 'u-shape',
          totalDevices: 1,
          devices: [
            {
              id: `dev-${rId}-1`,
              tag: 'PC-01',
              status: 'لم يتم العمل عليه' as DeviceStatus,
              brand: 'Dell OptiPlex',
              ram: '16GB',
              storage: '512GB SSD',
              powerSupply: 'سليم (500W)',
              deviceNotes: [],
            },
          ],
          skipAutoInstructorDevice: true,
          createdAt: seedRoom.createdAt,
        };
        nextRooms.push(targetRoom);
        roomsCreated += 1;
      }

      for (const dateStr of seedRoom.dates) {
        const visitKey = `${targetRoom.id}__${dateStr}`;
        if (!existingVisitKeys.has(visitKey)) {
          existingVisitKeys.add(visitKey);
          nextVisits.push({
            id: makeId('visit-xls'),
            roomId: targetRoom.id,
            date: dateStr,
            purpose: 'صيانة وتنفيذ',
            notes: `مستورد من سجل الطلبات (${targetRoom.name})`,
            createdAt: `${dateStr}T08:00:00.000Z`,
          });
          visitsAdded += 1;
        }
      }
    }
  }

  nextVisits.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return {
    buildings: nextBuildings,
    rooms: nextRooms,
    visits: nextVisits,
    buildingsCreated,
    roomsCreated,
    roomsIncremented,
    visitsAdded,
  };
}
