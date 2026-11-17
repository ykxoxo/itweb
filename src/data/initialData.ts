import type { Building, Room, MaintenanceLog, RoomDevice, DeviceStatus, RoomVisit } from '../types';

export const createDefaultDevices = (
  roomId: string,
  count: number,
  defaultStatus: DeviceStatus = 'لم يتم العمل عليه',
  brand = 'Dell OptiPlex'
): RoomDevice[] => {
  return Array.from({ length: count }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    let status: DeviceStatus = defaultStatus;
    if (i % 5 === 0) status = 'تم تحديثه';
    else if (i % 7 === 0) status = 'يحتاج صيانة';

    return {
      id: `dev-${roomId}-${i + 1}`,
      tag: `PC-${num}`,
      status,
      brand,
      ram: status === 'تم تحديثه' ? '16GB' : '8GB',
      storage: '512GB SSD',
      powerSupply: 'سليم (500W)',
      deviceNotes: [],
    };
  });
};

export const createDefaultInstructorDevice = (
  roomId: string,
  status: DeviceStatus = 'لم يتم العمل عليه',
  brand = 'Dell OptiPlex'
): RoomDevice => ({
  id: `dev-${roomId}-instructor`,
  tag: 'PC-Instructor',
  status,
  brand,
  ram: '16GB',
  storage: '512GB SSD',
  powerSupply: 'سليم (500W)',
  deviceNotes: [],
});

export const INITIAL_BUILDINGS: Building[] = [];

export const INITIAL_ROOMS: Room[] = [];

export const INITIAL_LOGS: MaintenanceLog[] = [];

export const INITIAL_VISITS: RoomVisit[] = [];
