import { useTranslation } from 'react-i18next';
import vi from './locales/vi/landing';
import en from './locales/en/landing';

/** Nội dung landing theo ngôn ngữ hiện tại (re-render khi đổi ngôn ngữ). */
export function useLanding() {
  const { i18n } = useTranslation();
  return i18n.resolvedLanguage === 'vi' ? vi : en;
}
