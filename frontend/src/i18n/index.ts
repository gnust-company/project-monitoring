// #29 Đa ngôn ngữ VI/EN bằng i18next + react-i18next.
// - Mặc định theo ngôn ngữ trình duyệt (navigator.languages): "vi*" → vi, "en*" → en, khác → en.
// - Người dùng đổi bằng <LanguageSwitcher>; lựa chọn chỉ lưu ở localStorage của trình duyệt
//   (không lưu vào tài khoản). Chưa chọn lần nào thì luôn đi theo trình duyệt.
// - Chuỗi giao diện nằm ở ./locales/{vi,en}; bản EN được kiểm tra đủ khóa lúc build (tsc).
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi';
import en from './locales/en';

export const LANGUAGES = ['vi', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

// Tên ngôn ngữ luôn viết bằng chính ngôn ngữ đó (không dịch).
export const LANGUAGE_NAMES: Record<Language, string> = { vi: 'Tiếng Việt', en: 'English' };

const STORAGE_KEY = 'projecthub.lang';

function isLanguage(v: unknown): v is Language {
  return v === 'vi' || v === 'en';
}

function detectLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch { /* localStorage bị chặn → theo trình duyệt */ }
  const prefs = typeof navigator === 'undefined'
    ? []
    : (navigator.languages?.length ? navigator.languages : [navigator.language]);
  for (const tag of prefs) {
    const base = tag?.toLowerCase().split('-')[0];
    if (isLanguage(base)) return base;
  }
  return 'en';
}

void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: detectLanguage(),
  fallbackLng: 'en',
  supportedLngs: LANGUAGES,
  interpolation: { escapeValue: false }, // React đã tự escape
  returnNull: false,
  initAsync: false, // tài nguyên nằm sẵn trong bundle → khởi tạo đồng bộ
});

document.documentElement.lang = i18n.language;
i18n.on('languageChanged', lng => { document.documentElement.lang = lng; });

/** Ngôn ngữ đang dùng (đã chuẩn hoá về 'vi' | 'en'). */
export function currentLanguage(): Language {
  return isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';
}

/** Người dùng chủ động chọn ngôn ngữ → nhớ trong trình duyệt. */
export function setLanguage(lng: Language): void {
  try { localStorage.setItem(STORAGE_KEY, lng); } catch { /* bỏ qua */ }
  void i18n.changeLanguage(lng);
}

export default i18n;
