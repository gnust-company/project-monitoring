// Gõ kiểu cho t(): khóa dịch sai/thiếu sẽ báo lỗi lúc build.
import 'i18next';
import type vi from './locales/vi';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof vi };
    returnNull: false;
  }
}
