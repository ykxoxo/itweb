import * as XLSX from 'xlsx';

export interface ParsedLocationResult {
  rawLocation: string;
  buildingKey: string;
  buildingName: string;
  buildingCode: string;
  floorCode: string;
  floorLabel: string;
  roomLabel: string;
  roomName: string;
  isFallbackPattern: boolean;
  hadLongCodeDecoded: boolean;
}

export interface ParsedExcelRow {
  rowNumber: number;
  rawDate: string;
  date: string;
  rawLocation: string;
  location: ParsedLocationResult;
  selected: boolean;
}

export interface ParsedExcelSummary {
  fileName: string;
  sheetName: string;
  detectedHeaders: string[];
  dateColIndex: number;
  locationColIndex: number;
  ignoredHeaders: string[];
  totalRawRows: number;
  emptyRowsSkipped: number;
  invalidDateRows: number;
  rows: ParsedExcelRow[];
}

export interface ExcelImportOptions {
  mode: 'merge' | 'replace';
  recordAs: 'visits' | 'visits-and-logs';
  deduplicateSameDayVisits: boolean;
  decodeLongCodes: boolean;
  deviceCountPerRoom: number;
  includeInstructorDevice: boolean;
}

const DATE_HEADER_CANDIDATES = [
  'تاريخ الطلب',
  'التاريخ',
  'تاريخ',
  'request date',
  'date',
  'created at',
];

const LOCATION_HEADER_CANDIDATES = [
  'المكان',
  'الموقع',
  'القاعة',
  'مكان',
  'location',
  'room',
];

const FLOOR_PATTERNS: Array<{ pattern: RegExp; code: string; label: string }> = [
  { pattern: /الدور\s*(?:ال)?[أإآا]رضي(?=\s|$)/, code: '0', label: 'الدور الأرضي' },
  { pattern: /الدور\s*(?:(?:ال)?[أإآا]ول|1)(?=\s|$)/, code: '1', label: 'الدور الأول' },
  { pattern: /الدور\s*(?:الثاني|2)(?=\s|$)/, code: '2', label: 'الدور الثاني' },
  { pattern: /الدور\s*(?:الثالث|3)(?=\s|$)/, code: '3', label: 'الدور الثالث' },
  { pattern: /الدور\s*(?:الرابع|4)(?=\s|$)/, code: '4', label: 'الدور الرابع' },
  { pattern: /الدور\s*(?:الخامس|5)(?=\s|$)/, code: '5', label: 'الدور الخامس' },
  { pattern: /الدور\s*(\d+)(?=\s|$)/, code: '$1', label: 'الدور' },
];

export function normalizeDigits(str: unknown): string {
  return String(str ?? '')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

export function normalizeArabicForMatch(str: unknown): string {
  return normalizeDigits(str)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase();
}

export function normalizeBuildingMatchKey(name: string): string {
  return normalizeArabicForMatch(name)
    .replace(/مبني\s+رقم\s+/g, 'مبني ')
    .replace(/\s*[-–]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pad2(n: number | string): string {
  return String(n).padStart(2, '0');
}

export function parseExcelDateOnly(rawVal: unknown): string | null {
  if (rawVal === null || rawVal === undefined) return null;

  if (rawVal instanceof Date && !Number.isNaN(rawVal.getTime())) {
    const y = rawVal.getFullYear();
    const m = rawVal.getMonth() + 1;
    const d = rawVal.getDate();
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  if (typeof rawVal === 'number' && Number.isFinite(rawVal) && rawVal > 20000 && rawVal < 90000) {
    const parsed = XLSX.SSF.parse_date_code(rawVal);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${pad2(parsed.m)}-${pad2(parsed.d)}`;
    }
  }

  const text = normalizeDigits(rawVal).trim();
  if (!text) return null;

  // ISO-style YYYY-MM-DD HH:mm:ss or YYYY/MM/DD
  const isoMatch = text.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${pad2(m)}-${pad2(d)}`;
    }
  }

  // Day-first DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = text.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const d = Number(dmyMatch[1]);
    const m = Number(dmyMatch[2]);
    const y = Number(dmyMatch[3]);
    if (y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${pad2(m)}-${pad2(d)}`;
    }
  }

  return null;
}

function normalizeBuildingDescriptor(beforeFloorRaw: string): {
  buildingKey: string;
  buildingName: string;
  buildingCode: string;
  recognized: boolean;
} {
  const cleaned = normalizeDigits(beforeFloorRaw).replace(/\s+/g, ' ').trim();
  const matchable = normalizeArabicForMatch(cleaned);

  // 1) "مبنى رقم 3" or "مبنى 3"
  const numBldgMatch = matchable.match(/^(?:ال)?مبني\s*(?:رقم\s*)?(\d+)$/);
  if (numBldgMatch) {
    const num = String(Number(numBldgMatch[1]));
    return {
      buildingKey: `bldg-num-${num}`,
      buildingName: `مبنى ${num}`,
      buildingCode: num,
      recognized: true,
    };
  }

  // 2) "المبنى الجنوبي-15" / "المبنى الجنوبي 16"
  const southNumMatch = matchable.match(/^(?:ال)?مبني\s+الجنوبي\s*[-–]?\s*(\d+)$/);
  if (southNumMatch) {
    const num = String(Number(southNumMatch[1]));
    return {
      buildingKey: `bldg-south-${num}`,
      buildingName: `المبنى الجنوبي - ${num}`,
      buildingCode: num,
      recognized: true,
    };
  }

  // 3) "المبنى الجنوبي-الورش"
  if (/^(?:ال)?مبني\s+الجنوبي\s*[-–]?\s*الورش$/.test(matchable)) {
    return {
      buildingKey: 'bldg-south-workshops',
      buildingName: 'المبنى الجنوبي - الورش',
      buildingCode: 'الورش',
      recognized: true,
    };
  }

  // 4) "مبنى العمادة"
  if (/^(?:ال)?مبني\s+العماده$/.test(matchable)) {
    return {
      buildingKey: 'bldg-deanship',
      buildingName: 'مبنى العمادة',
      buildingCode: 'العمادة',
      recognized: true,
    };
  }

  // 5) "الصالة المتعددة الاغراض"
  if (/^الصاله\s+المتعدده\s+الاغراض$/.test(matchable)) {
    return {
      buildingKey: 'bldg-multipurpose-hall',
      buildingName: 'الصالة المتعددة الأغراض',
      buildingCode: 'الصالة',
      recognized: true,
    };
  }

  // Fallback for any other building naming
  const trailingNum = cleaned.match(/(\d+)$/);
  const fallbackName = cleaned || 'مبنى غير محدد';
  return {
    buildingKey: `bldg-custom-${normalizeBuildingMatchKey(fallbackName)}`,
    buildingName: fallbackName,
    buildingCode: trailingNum ? String(Number(trailingNum[1])) : fallbackName,
    recognized: Boolean(cleaned),
  };
}

function decodeRoomPart(
  rawRoomAfterFloor: string,
  decodeLongCodes: boolean
): { roomLabel: string; hadLongCodeDecoded: boolean } {
  let cleaned = normalizeDigits(rawRoomAfterFloor).replace(/\s+/g, ' ').trim();

  // Strip literal "قاعة 104" -> "104" while preserving named halls/labs/offices
  const hallNumMatch = cleaned.match(/^قاع[ةه]\s+(\d+)$/);
  if (hallNumMatch) {
    cleaned = hallNumMatch[1];
  }

  // Decode 10-digit college ERP room codes like 1040120103 (104 + bldg 01 + floor 2 + room 0103 -> 103)
  if (decodeLongCodes) {
    const erpMatch = cleaned.match(/^104(\d{2})(\d)(\d{4})$/);
    if (erpMatch) {
      const shortRoomNum = String(Number(erpMatch[3]));
      return { roomLabel: shortRoomNum, hadLongCodeDecoded: true };
    }
  }

  return { roomLabel: cleaned || 'عام', hadLongCodeDecoded: false };
}

export function parseLocationToBuildingAndRoom(
  rawLocation: string,
  options?: { decodeLongCodes?: boolean }
): ParsedLocationResult {
  const decodeLongCodes = options?.decodeLongCodes !== false;
  const cleanedRaw = normalizeDigits(rawLocation).replace(/\s+/g, ' ').trim();

  if (!cleanedRaw) {
    return {
      rawLocation: '',
      buildingKey: 'bldg-unknown',
      buildingName: 'مبنى غير محدد',
      buildingCode: '?',
      floorCode: '',
      floorLabel: '',
      roomLabel: 'غير محدد',
      roomName: 'غير محدد',
      isFallbackPattern: true,
      hadLongCodeDecoded: false,
    };
  }

  for (const fp of FLOOR_PATTERNS) {
    const match = cleanedRaw.match(fp.pattern);
    if (match && match.index !== undefined) {
      const beforeFloor = cleanedRaw.slice(0, match.index).trim();
      const afterFloor = cleanedRaw.slice(match.index + match[0].length).trim();

      const resolvedFloorCode = fp.code === '$1' ? String(Number(match[1])) : fp.code;
      const resolvedFloorLabel =
        fp.label === 'الدور' ? `الدور ${resolvedFloorCode}` : fp.label;

      const bldg = normalizeBuildingDescriptor(beforeFloor);
      const roomDecoded = decodeRoomPart(afterFloor, decodeLongCodes);
      const roomName = `${bldg.buildingCode}-${resolvedFloorCode}-${roomDecoded.roomLabel}`;

      return {
        rawLocation: String(rawLocation).trim(),
        buildingKey: bldg.buildingKey,
        buildingName: bldg.buildingName,
        buildingCode: bldg.buildingCode,
        floorCode: resolvedFloorCode,
        floorLabel: resolvedFloorLabel,
        roomLabel: roomDecoded.roomLabel,
        roomName,
        isFallbackPattern: !bldg.recognized || !afterFloor,
        hadLongCodeDecoded: roomDecoded.hadLongCodeDecoded,
      };
    }
  }

  // Fallback when no explicit "الدور ..." keyword appears
  const bldg = normalizeBuildingDescriptor(cleanedRaw);
  return {
    rawLocation: String(rawLocation).trim(),
    buildingKey: bldg.buildingKey,
    buildingName: bldg.buildingName,
    buildingCode: bldg.buildingCode,
    floorCode: '',
    floorLabel: '',
    roomLabel: cleanedRaw,
    roomName: cleanedRaw,
    isFallbackPattern: true,
    hadLongCodeDecoded: false,
  };
}

function findHeaderRowAndCols(matrix: unknown[][]): {
  headerRowIdx: number;
  dateColIndex: number;
  locationColIndex: number;
  headers: string[];
} {
  const maxScan = Math.min(matrix.length, 15);

  for (let r = 0; r < maxScan; r++) {
    const row = Array.isArray(matrix[r]) ? matrix[r] : [];
    const normalizedCells = row.map((c) => normalizeArabicForMatch(c));

    const dateIdx = normalizedCells.findIndex((cell) =>
      DATE_HEADER_CANDIDATES.some((cand) => cell === normalizeArabicForMatch(cand) || cell.includes(normalizeArabicForMatch(cand)))
    );
    const locIdx = normalizedCells.findIndex((cell) =>
      LOCATION_HEADER_CANDIDATES.some((cand) => cell === normalizeArabicForMatch(cand) || cell.includes(normalizeArabicForMatch(cand)))
    );

    if (dateIdx !== -1 && locIdx !== -1) {
      return {
        headerRowIdx: r,
        dateColIndex: dateIdx,
        locationColIndex: locIdx,
        headers: row.map((c) => String(c ?? '').trim()),
      };
    }
  }

  // Fallback: guess from first non-empty row if headers were omitted or named unexpectedly
  for (let r = 0; r < maxScan; r++) {
    const row = Array.isArray(matrix[r]) ? matrix[r] : [];
    const nonEmptyCount = row.filter((c) => String(c ?? '').trim() !== '').length;
    if (nonEmptyCount >= 2) {
      return {
        headerRowIdx: -1,
        dateColIndex: 0,
        locationColIndex: 1,
        headers: row.map((c, i) => String(c ?? '').trim() || `عمود ${i + 1}`),
      };
    }
  }

  return { headerRowIdx: -1, dateColIndex: 0, locationColIndex: 1, headers: [] };
}

export function extractExcelRowsFromMatrix(
  matrix: unknown[][],
  options?: {
    decodeLongCodes?: boolean;
    dateColIndex?: number;
    locationColIndex?: number;
    headerRowIdx?: number;
  }
): Omit<ParsedExcelSummary, 'fileName' | 'sheetName'> {
  const detected = findHeaderRowAndCols(matrix);
  const headerRowIdx =
    options?.headerRowIdx !== undefined ? options.headerRowIdx : detected.headerRowIdx;
  const dateColIndex =
    options?.dateColIndex !== undefined ? options.dateColIndex : detected.dateColIndex;
  const locationColIndex =
    options?.locationColIndex !== undefined ? options.locationColIndex : detected.locationColIndex;

  const ignoredHeaders = detected.headers.filter(
    (h, idx) => Boolean(h) && idx !== dateColIndex && idx !== locationColIndex
  );

  const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  let totalRawRows = 0;
  let emptyRowsSkipped = 0;
  let invalidDateRows = 0;
  const parsedRows: ParsedExcelRow[] = [];

  for (let r = startRow; r < matrix.length; r++) {
    const row = Array.isArray(matrix[r]) ? matrix[r] : [];
    const hasAnyValue = row.some((c) => String(c ?? '').trim() !== '');
    if (!hasAnyValue) {
      emptyRowsSkipped += 1;
      continue;
    }

    const rawDateCell = row[dateColIndex];
    const rawLocationCell = row[locationColIndex];
    const rawDateStr = String(rawDateCell ?? '').trim();
    const rawLocationStr = String(rawLocationCell ?? '').trim();

    if (!rawDateStr && !rawLocationStr) {
      emptyRowsSkipped += 1;
      continue;
    }

    totalRawRows += 1;
    const parsedDate = parseExcelDateOnly(rawDateCell);
    if (!parsedDate) {
      invalidDateRows += 1;
      continue;
    }

    if (!rawLocationStr) {
      emptyRowsSkipped += 1;
      continue;
    }

    const location = parseLocationToBuildingAndRoom(rawLocationStr, {
      decodeLongCodes: options?.decodeLongCodes !== false,
    });

    parsedRows.push({
      rowNumber: r + 1,
      rawDate: rawDateStr,
      date: parsedDate,
      rawLocation: rawLocationStr,
      location,
      selected: true,
    });
  }

  return {
    detectedHeaders: detected.headers,
    dateColIndex,
    locationColIndex,
    ignoredHeaders,
    totalRawRows,
    emptyRowsSkipped,
    invalidDateRows,
    rows: parsedRows,
  };
}

function decodeCsvTextSafely(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  // Strip UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  // If replacement characters appeared, retry with Windows-1256 (Arabic Excel CSV ANSI)
  if (text.includes('\uFFFD')) {
    try {
      text = new TextDecoder('windows-1256').decode(bytes);
    } catch {
      // Keep utf-8 text
    }
  }
  return text;
}

export async function readMatrixFromSpreadsheetFile(file: File): Promise<{
  sheetName: string;
  matrix: unknown[][];
}> {
  const lowerName = file.name.toLowerCase();
  const isTextCsv = lowerName.endsWith('.csv') || lowerName.endsWith('.txt');
  const buffer = await file.arrayBuffer();

  let workbook: XLSX.WorkBook;
  if (isTextCsv) {
    const csvText = decodeCsvTextSafely(buffer);
    workbook = XLSX.read(csvText, { type: 'string', raw: true });
  } else {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  }

  const sheetName = workbook.SheetNames[0] || 'Sheet1';
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error('لم يتم العثور على أي ورقة عمل صالحة داخل الملف');
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  });

  return { sheetName, matrix };
}

export async function parseScheduleWorkbook(
  file: File,
  options?: { decodeLongCodes?: boolean }
): Promise<ParsedExcelSummary> {
  const { sheetName, matrix } = await readMatrixFromSpreadsheetFile(file);
  const extracted = extractExcelRowsFromMatrix(matrix, options);
  return {
    fileName: file.name,
    sheetName,
    ...extracted,
  };
}
