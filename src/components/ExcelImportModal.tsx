'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  extractExcelRowsFromMatrix,
  normalizeArabicForMatch,
  normalizeBuildingMatchKey,
  readMatrixFromSpreadsheetFile,
  type ExcelImportOptions,
  type ParsedExcelRow,
} from '../utils/excelLocationImporter';
import {
  FileSpreadsheet,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Building2,
  DoorOpen,
  Calendar,
  Cpu,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose }) => {
  const { buildings, rooms, visits, importExcelSchedule, showToast } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Raw loaded sheet matrix
  const [loadedFileMeta, setLoadedFileMeta] = useState<{
    fileName: string;
    sheetName: string;
    matrix: unknown[][];
  } | null>(null);

  // Import configuration options
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [recordAs, setRecordAs] = useState<'visits' | 'visits-and-logs'>('visits');
  const [deduplicateSameDayVisits, setDeduplicateSameDayVisits] = useState(true);
  const [decodeLongCodes, setDecodeLongCodes] = useState(true);
  const [singleDeviceOnly, setSingleDeviceOnly] = useState(true);
  const [manualDateCol, setManualDateCol] = useState<number | undefined>(undefined);
  const [manualLocCol, setManualLocCol] = useState<number | undefined>(undefined);

  // Editable parsed rows and preview filters
  const [editableRows, setEditableRows] = useState<ParsedExcelRow[]>([]);
  const [metaStats, setMetaStats] = useState<{
    detectedHeaders: string[];
    dateColIndex: number;
    locationColIndex: number;
    ignoredHeaders: string[];
    totalRawRows: number;
    emptyRowsSkipped: number;
    invalidDateRows: number;
  } | null>(null);

  const [previewSearch, setPreviewSearch] = useState('');
  const [previewFilter, setPreviewFilter] = useState<'all' | 'fallback' | 'new-rooms'>('all');
  const [showAllPreviewRows, setShowAllPreviewRows] = useState(false);

  const recomputeFromMatrix = (
    matrix: unknown[][],
    opts: {
      decodeLongCodes: boolean;
      dateColIndex?: number;
      locationColIndex?: number;
    }
  ) => {
    const extracted = extractExcelRowsFromMatrix(matrix, opts);
    setEditableRows(extracted.rows);
    setMetaStats({
      detectedHeaders: extracted.detectedHeaders,
      dateColIndex: extracted.dateColIndex,
      locationColIndex: extracted.locationColIndex,
      ignoredHeaders: extracted.ignoredHeaders,
      totalRawRows: extracted.totalRawRows,
      emptyRowsSkipped: extracted.emptyRowsSkipped,
      invalidDateRows: extracted.invalidDateRows,
    });
  };

  const handleFileProcess = async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setManualDateCol(undefined);
    setManualLocCol(undefined);

    try {
      const { sheetName, matrix } = await readMatrixFromSpreadsheetFile(file);
      setLoadedFileMeta({ fileName: file.name, sheetName, matrix });
      recomputeFromMatrix(matrix, { decodeLongCodes });
      setPreviewSearch('');
      setPreviewFilter('all');
      setShowAllPreviewRows(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر قراءة الملف المحدد';
      setParseError(msg);
      showToast('تعذر قراءة ملف Excel: تأكد من سلامة الملف وصيغته', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleResetModal = () => {
    setLoadedFileMeta(null);
    setEditableRows([]);
    setMetaStats(null);
    setParseError(null);
    setManualDateCol(undefined);
    setManualLocCol(undefined);
    setPreviewSearch('');
    setPreviewFilter('all');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleToggleDecodeLongCodes = (nextVal: boolean) => {
    setDecodeLongCodes(nextVal);
    if (loadedFileMeta) {
      recomputeFromMatrix(loadedFileMeta.matrix, {
        decodeLongCodes: nextVal,
        dateColIndex: manualDateCol,
        locationColIndex: manualLocCol,
      });
    }
  };

  const handleColumnOverrideChange = (newDateCol: number, newLocCol: number) => {
    setManualDateCol(newDateCol);
    setManualLocCol(newLocCol);
    if (loadedFileMeta) {
      recomputeFromMatrix(loadedFileMeta.matrix, {
        decodeLongCodes,
        dateColIndex: newDateCol,
        locationColIndex: newLocCol,
      });
    }
  };

  const updateRowField = (
    rowNumber: number,
    field: 'buildingName' | 'roomName' | 'date' | 'selected',
    value: string | boolean
  ) => {
    setEditableRows((prev) =>
      prev.map((row) => {
        if (row.rowNumber !== rowNumber) return row;
        if (field === 'selected') {
          return { ...row, selected: Boolean(value) };
        }
        if (field === 'date') {
          return { ...row, date: String(value) };
        }
        return {
          ...row,
          location: {
            ...row.location,
            [field]: String(value),
          },
        };
      })
    );
  };

  // Compute live distribution preview stats
  const distributionSummary = useMemo(() => {
    const existingBldgKeys = new Set(
      mode === 'replace' ? [] : buildings.map((b) => normalizeBuildingMatchKey(b.name))
    );
    const existingRoomKeys = new Set(
      mode === 'replace'
        ? []
        : rooms.map((r) => {
            const b = buildings.find((bd) => bd.id === r.buildingId);
            const bKey = normalizeBuildingMatchKey(b?.name || '');
            return `${bKey}__${normalizeArabicForMatch(r.name)}`;
          })
    );
    const existingVisits = new Set(
      mode === 'replace'
        ? []
        : visits.map((v) => {
            const r = rooms.find((rm) => rm.id === v.roomId);
            const b = r ? buildings.find((bd) => bd.id === r.buildingId) : undefined;
            const bKey = normalizeBuildingMatchKey(b?.name || '');
            const rKey = normalizeArabicForMatch(r?.name || '');
            return `${bKey}__${rKey}__${(v.date || '').slice(0, 10)}`;
          })
    );

    const uniqueBuildings = new Set<string>();
    const newBuildings = new Set<string>();
    const uniqueRooms = new Set<string>();
    const newRooms = new Set<string>();
    const newRoomKeySet = new Set<string>();
    const plannedVisits = new Set<string>();
    let duplicateVisitCount = 0;
    let fallbackCount = 0;

    for (const row of editableRows) {
      if (!row.selected) continue;
      if (row.location.isFallbackPattern) fallbackCount += 1;

      const bKey = normalizeBuildingMatchKey(row.location.buildingName);
      const rKey = `${bKey}__${normalizeArabicForMatch(row.location.roomName)}`;
      const vKey = `${rKey}__${row.date}`;

      uniqueBuildings.add(bKey);
      if (!existingBldgKeys.has(bKey)) newBuildings.add(bKey);

      uniqueRooms.add(rKey);
      if (!existingRoomKeys.has(rKey)) {
        newRooms.add(rKey);
        newRoomKeySet.add(rKey);
      }

      if (deduplicateSameDayVisits) {
        if (existingVisits.has(vKey) || plannedVisits.has(vKey)) {
          duplicateVisitCount += 1;
        } else {
          plannedVisits.add(vKey);
        }
      }
    }

    const selectedCount = editableRows.filter((r) => r.selected).length;

    return {
      selectedCount,
      uniqueBuildingsCount: uniqueBuildings.size,
      newBuildingsCount: newBuildings.size,
      uniqueRoomsCount: uniqueRooms.size,
      newRoomsCount: newRooms.size,
      newRoomKeySet,
      effectiveVisitsCount: deduplicateSameDayVisits ? plannedVisits.size : selectedCount,
      duplicateVisitCount,
      fallbackCount,
    };
  }, [editableRows, buildings, rooms, visits, mode, deduplicateSameDayVisits]);

  const filteredPreviewRows = useMemo(() => {
    const q = normalizeArabicForMatch(previewSearch);
    return editableRows.filter((row) => {
      if (previewFilter === 'fallback' && !row.location.isFallbackPattern) return false;
      if (previewFilter === 'new-rooms') {
        const key = `${normalizeBuildingMatchKey(row.location.buildingName)}__${normalizeArabicForMatch(row.location.roomName)}`;
        if (!distributionSummary.newRoomKeySet.has(key)) return false;
      }
      if (!q) return true;
      return (
        normalizeArabicForMatch(row.rawLocation).includes(q) ||
        normalizeArabicForMatch(row.location.buildingName).includes(q) ||
        normalizeArabicForMatch(row.location.roomName).includes(q) ||
        row.date.includes(q)
      );
    });
  }, [editableRows, previewSearch, previewFilter, distributionSummary.newRoomKeySet]);

  const displayedPreviewRows = useMemo(
    () => (showAllPreviewRows ? filteredPreviewRows : filteredPreviewRows.slice(0, 120)),
    [filteredPreviewRows, showAllPreviewRows]
  );

  const handleConfirmImport = () => {
    if (distributionSummary.selectedCount === 0) return;

    if (
      mode === 'replace' &&
      !window.confirm(
        'سيتم استبدال المباني والقاعات الحالية ببيانات ملف Excel فقط. هل أنت متأكد من المتابعة؟'
      )
    ) {
      return;
    }

    const options: ExcelImportOptions = {
      mode,
      recordAs,
      deduplicateSameDayVisits,
      decodeLongCodes,
      deviceCountPerRoom: 1,
      includeInstructorDevice: !singleDeviceOnly,
    };

    importExcelSchedule(editableRows, options);
    handleResetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-6xl w-full my-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                استيراد وتوزيع القاعات من ملف Excel / CSV
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                يأخذ <span className="font-bold text-slate-700 dark:text-slate-200">التاريخ والمكان فقط</span> ويتجاهل باقي الأعمدة، ثم ينشئ المبنى والقاعة (بجهاز واحد) مثل <span dir="ltr" className="font-mono font-bold text-blue-600 dark:text-blue-400">3-1-104</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              handleResetModal();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Step 1: Dropzone */}
          {!loadedFileMeta && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) void handleFileProcess(dropped);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Upload className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {isParsing ? 'جاري قراءة وتحليل الملف...' : 'اسحب ملف Excel أو CSV هنا، أو اضغط للاختيار'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-xl mx-auto leading-relaxed">
                يدعم صيغ <span dir="ltr" className="font-mono font-bold">.xlsx / .xls / .csv</span> — يتم حذف أعمدة (رقم الطلب، مقدم الطلب، مختصر المشكلة، فترة التدريب، سبب الإغلاق) تلقائياً وإبقاء <strong>تاريخ الطلب والمكان فقط</strong>.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>اختيار ملف من الجهاز</span>
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFileProcess(f);
            }}
          />

          {parseError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Step 2: Preview & Mapping Controls */}
          {loadedFileMeta && metaStats && (
            <>
              {/* File Strip & Stripped Columns Info */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      {loadedFileMeta.fileName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                      الأعمدة المعتمدة: التاريخ + المكان فقط
                    </span>
                    {metaStats.emptyRowsSkipped > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                        تم تجاهل {metaStats.emptyRowsSkipped} صف فارغ
                      </span>
                    )}
                  </div>

                  {metaStats.ignoredHeaders.length > 0 && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-rose-600 dark:text-rose-400">الأعمدة المُزالة تلقائياً:</span>{' '}
                      {metaStats.ignoredHeaders.join(' • ')}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleResetModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 self-start"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>اختيار ملف آخر</span>
                </button>
              </div>

              {/* Manual Column Fallback if unusual spreadsheet headers */}
              {metaStats.detectedHeaders.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">عمود التاريخ:</span>
                    <select
                      value={metaStats.dateColIndex}
                      onChange={(e) => handleColumnOverrideChange(Number(e.target.value), metaStats.locationColIndex)}
                      className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                    >
                      {metaStats.detectedHeaders.map((h, idx) => (
                        <option key={`date-col-${idx}`} value={idx}>
                          {h || `عمود ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">عمود المكان:</span>
                    <select
                      value={metaStats.locationColIndex}
                      onChange={(e) => handleColumnOverrideChange(metaStats.dateColIndex, Number(e.target.value))}
                      className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                    >
                      {metaStats.detectedHeaders.map((h, idx) => (
                        <option key={`loc-col-${idx}`} value={idx}>
                          {h || `عمود ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Distribution Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                    <Building2 className="w-4 h-4" />
                    <span>المباني بالملف</span>
                  </div>
                  <div className="text-xl font-black text-blue-950 dark:text-white mt-1">
                    {distributionSummary.uniqueBuildingsCount}
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mr-1.5">
                      (+{distributionSummary.newBuildingsCount} جديد)
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                    <DoorOpen className="w-4 h-4" />
                    <span>القاعات الموزعة</span>
                  </div>
                  <div className="text-xl font-black text-indigo-950 dark:text-white mt-1">
                    {distributionSummary.uniqueRoomsCount}
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mr-1.5">
                      (+{distributionSummary.newRoomsCount} جديد)
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    <Calendar className="w-4 h-4" />
                    <span>تواريخ الزيارات المسجلة</span>
                  </div>
                  <div className="text-xl font-black text-emerald-950 dark:text-white mt-1">
                    {distributionSummary.effectiveVisitsCount}
                    {distributionSummary.duplicateVisitCount > 0 && (
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1.5">
                        (دُمج {distributionSummary.duplicateVisitCount} مكرر)
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <Cpu className="w-4 h-4" />
                    <span>الأجهزة بكل قاعة جديدة</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {singleDeviceOnly ? '1 جهاز (PC-01)' : '1 + جهاز المدرب'}
                  </div>
                </div>
              </div>

              {/* Distribution & Behavior Options */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      وضع التوزيع على النظام:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMode('merge')}
                        className={`px-3 py-2 rounded-xl border font-bold text-xs transition-all ${
                          mode === 'merge'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        دمج مع القاعات الحالية
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('replace')}
                        className={`px-3 py-2 rounded-xl border font-bold text-xs transition-all ${
                          mode === 'replace'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        استبدال التجريبي ببيانات الملف
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      طريقة تسجيل التاريخ في القاعة:
                    </span>
                    <select
                      value={recordAs}
                      onChange={(e) => setRecordAs(e.target.value as 'visits' | 'visits-and-logs')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="visits">زيارات صيانة وتنفيذ (موصى به — يوثق الزيارات والتاريخ دون تضخيم العدادات)</option>
                      <option value="visits-and-logs">زيارات + عمليات صيانة عامة (جهاز واحد لكل عملية)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={deduplicateSameDayVisits}
                      onChange={(e) => setDeduplicateSameDayVisits(e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span>دمج الطلبات المتكررة بنفس اليوم ونفس القاعة كزيارة واحدة</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={decodeLongCodes}
                      onChange={(e) => handleToggleDecodeLongCodes(e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span>تحويل الرموز الطويلة (مثل 1040120103 ⬅ 1-2-103)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={singleDeviceOnly}
                      onChange={(e) => setSingleDeviceOnly(e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span>إنشاء جهاز واحد فقط (PC-01) لكل قاعة جديدة</span>
                  </label>
                </div>
              </div>

              {/* Filter & Search Bar for Preview Table */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder="ابحث في المعاينة (مثلاً: 3-1-104 أو العمادة أو 2026)..."
                    className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
                  {[
                    { id: 'all', label: `الكل (${editableRows.length})` },
                    { id: 'new-rooms', label: `قاعات جديدة (${distributionSummary.newRoomsCount})` },
                    ...(distributionSummary.fallbackCount > 0
                      ? [{ id: 'fallback', label: `تحتاج مراجعة (${distributionSummary.fallbackCount})` }]
                      : []),
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPreviewFilter(f.id as 'all' | 'fallback' | 'new-rooms')}
                      className={`px-3 py-2 rounded-xl font-bold border transition-all ${
                        previewFilter === f.id
                          ? 'bg-slate-800 dark:bg-blue-600 text-white border-slate-800 dark:border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 w-10 text-center">تحديد</th>
                        <th className="p-2.5 w-14 text-center">صف</th>
                        <th className="p-2.5 whitespace-nowrap">التاريخ المستخرج</th>
                        <th className="p-2.5">المكان في الملف</th>
                        <th className="p-2.5">المبنى (قابل للتعديل)</th>
                        <th className="p-2.5">اسم القاعة النهائي (قابل للتعديل)</th>
                        <th className="p-2.5 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                      {displayedPreviewRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            لا توجد صفوف مطابقة للبحث الحالي
                          </td>
                        </tr>
                      ) : (
                        displayedPreviewRows.map((row) => {
                          const rKey = `${normalizeBuildingMatchKey(row.location.buildingName)}__${normalizeArabicForMatch(row.location.roomName)}`;
                          const isNewRoom = distributionSummary.newRoomKeySet.has(rKey);

                          return (
                            <tr
                              key={row.rowNumber}
                              className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                                !row.selected ? 'opacity-50' : ''
                              }`}
                            >
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={row.selected}
                                  onChange={(e) => updateRowField(row.rowNumber, 'selected', e.target.checked)}
                                  className="w-3.5 h-3.5 accent-blue-600"
                                />
                              </td>
                              <td className="p-2 text-center text-slate-400 font-mono text-[11px]">
                                {row.rowNumber}
                              </td>
                              <td className="p-2 whitespace-nowrap font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                                <input
                                  type="text"
                                  value={row.date}
                                  onChange={(e) => updateRowField(row.rowNumber, 'date', e.target.value)}
                                  className="w-26 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center"
                                />
                              </td>
                              <td className="p-2 text-slate-600 dark:text-slate-300 max-w-[220px] truncate" title={row.rawLocation}>
                                {row.rawLocation}
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={row.location.buildingName}
                                  onChange={(e) => updateRowField(row.rowNumber, 'buildingName', e.target.value)}
                                  className="w-full min-w-[140px] px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={row.location.roomName}
                                  onChange={(e) => updateRowField(row.rowNumber, 'roomName', e.target.value)}
                                  className="w-full min-w-[130px] px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 font-black"
                                  dir="auto"
                                />
                              </td>
                              <td className="p-2 text-center whitespace-nowrap">
                                {row.location.isFallbackPattern ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                                    مراجعة نمط
                                  </span>
                                ) : isNewRoom ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                    جديدة (1 جهاز)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                                    دمج بموجودة
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredPreviewRows.length > 120 && !showAllPreviewRows && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-700 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAllPreviewRows(true)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      عرض جميع الصفوف ({filteredPreviewRows.length} صف) — المعروض حالياً أول 120 صف
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>
              {loadedFileMeta
                ? `جاهز لتوزيع ${distributionSummary.selectedCount} سجل على ${distributionSummary.uniqueRoomsCount} قاعة`
                : 'ارفع ملف Excel أو CSV للبدء بالمعاينة قبل الحفظ'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                handleResetModal();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={!loadedFileMeta || distributionSummary.selectedCount === 0}
              onClick={handleConfirmImport}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold text-xs shadow-md transition-all disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                تأكيد التوزيع والحفظ ({distributionSummary.newRoomsCount} قاعة جديدة / {distributionSummary.effectiveVisitsCount} تاريخ)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
