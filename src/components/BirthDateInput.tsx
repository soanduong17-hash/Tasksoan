import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';

interface BirthDateInputProps {
  value: string; // ISO format "YYYY-MM-DD" or standard date string
  onChange: (isoDate: string) => void;
  label?: string;
  required?: boolean;
}

/**
 * Component nhập Ngày tháng năm sinh theo đúng thứ tự chuẩn Việt Nam:
 * Thứ tự nghiêm ngặt: Ngày (Day) -> Tháng (Month) -> Năm (Year)
 */
export const BirthDateInput: React.FC<BirthDateInputProps> = ({
  value,
  onChange,
  label = 'Ngày tháng năm sinh (Đúng thứ tự: Ngày - Tháng - Năm)',
  required = true,
}) => {
  // Parse YYYY-MM-DD into day, month, year
  const { currentDay, currentMonth, currentYear } = useMemo(() => {
    if (!value) {
      return { currentDay: 1, currentMonth: 1, currentYear: 1996 };
    }
    const parts = value.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10) || 1996;
      const m = parseInt(parts[1], 10) || 1;
      const d = parseInt(parts[2], 10) || 1;
      return { currentDay: d, currentMonth: m, currentYear: y };
    }
    const dObj = new Date(value);
    if (!isNaN(dObj.getTime())) {
      return {
        currentDay: dObj.getDate(),
        currentMonth: dObj.getMonth() + 1,
        currentYear: dObj.getFullYear(),
      };
    }
    return { currentDay: 1, currentMonth: 1, currentYear: 1996 };
  }, [value]);

  const currentYearNow = new Date().getFullYear();

  // Days in month calculation (taking leap years into account)
  const maxDays = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  const safeDay = Math.min(currentDay, maxDays);

  const handleDayChange = (newDay: number) => {
    const formatted = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
    onChange(formatted);
  };

  const handleMonthChange = (newMonth: number) => {
    const newMaxDays = new Date(currentYear, newMonth, 0).getDate();
    const adjustedDay = Math.min(currentDay, newMaxDays);
    const formatted = `${currentYear}-${String(newMonth).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')}`;
    onChange(formatted);
  };

  const handleYearChange = (newYear: number) => {
    const newMaxDays = new Date(newYear, currentMonth, 0).getDate();
    const adjustedDay = Math.min(currentDay, newMaxDays);
    const formatted = `${newYear}-${String(currentMonth).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')}`;
    onChange(formatted);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
          Thứ tự chuẩn: Ngày / Tháng / Năm
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* 1. NGÀY */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 block">
            1. Ngày <span className="text-slate-400 font-normal">(01 - {maxDays})</span>
          </label>
          <select
            value={safeDay}
            onChange={(e) => handleDayChange(parseInt(e.target.value, 10))}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs"
          >
            {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Ngày {String(d).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        {/* 2. THÁNG */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 block">
            2. Tháng <span className="text-slate-400 font-normal">(01 - 12)</span>
          </label>
          <select
            value={currentMonth}
            onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Tháng {String(m).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        {/* 3. NĂM */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 block">
            3. Năm <span className="text-slate-400 font-normal">(1940 - {currentYearNow})</span>
          </label>
          <select
            value={currentYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs"
          >
            {Array.from({ length: currentYearNow - 1939 }, (_, i) => currentYearNow - i).map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visual Confirmation Banner */}
      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
        <span className="text-[11px] font-medium text-slate-500">Hiển thị theo thứ tự Ngày / Tháng / Năm:</span>
        <span className="font-extrabold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 font-mono shadow-2xs">
          {String(safeDay).padStart(2, '0')} / {String(currentMonth).padStart(2, '0')} / {currentYear}
        </span>
      </div>
    </div>
  );
};
