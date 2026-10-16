// Định dạng ngày giờ theo ngôn ngữ đang chọn (#29). Chỉ dùng cho HIỂN THỊ — chuỗi ngày
// gửi lên API vẫn là 'yyyy-MM-dd' (format của date-fns, không qua đây).
import { format, parseISO } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import i18n, { currentLanguage, type Language } from '.';

export type DateStyle =
  | 'date'           // 14/10/2026 · Oct 14, 2026
  | 'dateShort'      // 14/10 · Oct 14
  | 'dateTime'       // 14/10/2026 09:30 · Oct 14, 2026 09:30
  | 'dateTimeShort'  // 14/10 09:30 · Oct 14, 09:30
  | 'monthYear'      // 10/2026 · Oct 2026
  | 'fullDate';      // Thứ Tư, 14/10/2026 · Wednesday, October 14, 2026

const PATTERNS: Record<Language, Record<DateStyle, string>> = {
  vi: {
    date: 'dd/MM/yyyy', dateShort: 'dd/MM', dateTime: 'dd/MM/yyyy HH:mm', dateTimeShort: 'dd/MM HH:mm',
    monthYear: 'MM/yyyy', fullDate: 'EEEE, dd/MM/yyyy',
  },
  en: {
    date: 'MMM d, yyyy', dateShort: 'MMM d', dateTime: 'MMM d, yyyy HH:mm', dateTimeShort: 'MMM d, HH:mm',
    monthYear: 'MMM yyyy', fullDate: 'EEEE, MMMM d, yyyy',
  },
};

const LOCALES = { vi, en: enUS };

/** Ngày (Date hoặc chuỗi ISO) → chuỗi hiển thị theo ngôn ngữ hiện tại; ngày lỗi → "—". */
export function formatDate(value: Date | string, style: DateStyle = 'date'): string {
  const d = typeof value === 'string' ? parseISO(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  const lang = currentLanguage();
  const text = format(d, PATTERNS[lang][style], { locale: LOCALES[lang] });
  // date-fns vi viết thường thứ ("thứ tư") → viết hoa chữ đầu cho tiêu đề.
  return style === 'fullDate' ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** "vừa xong" / "5 phút trước" / "2 giờ trước" / "3 ngày trước" (và bản EN tương ứng). */
export function formatRelative(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return i18n.t('time.justNow');
  if (minutes < 60) return i18n.t('time.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18n.t('time.hoursAgo', { count: hours });
  return i18n.t('time.daysAgo', { count: Math.floor(hours / 24) });
}
