// #29: nút đổi ngôn ngữ VI | EN. Lựa chọn lưu trong trình duyệt (xem src/i18n/index.ts).
import { useTranslation } from 'react-i18next';
import { LANGUAGES, LANGUAGE_NAMES, currentLanguage, setLanguage } from '../../i18n';

export default function LanguageSwitcher({ tone = 'light', className = '' }: {
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const { t } = useTranslation(); // re-render khi đổi ngôn ngữ
  const active = currentLanguage();
  const frame = tone === 'dark' ? 'bg-white/[0.06]' : 'bg-stone-100';
  const on = tone === 'dark' ? 'bg-white/[0.14] text-white' : 'bg-white text-ink shadow-sm';
  const off = tone === 'dark' ? 'text-white/40 hover:text-white' : 'text-muted hover:text-ink';
  return (
    <div role="group" aria-label={t('common.language')}
      className={`inline-flex items-center rounded-lg p-0.5 ${frame} ${className}`}>
      {LANGUAGES.map(lng => (
        <button key={lng} type="button" onClick={() => setLanguage(lng)}
          aria-pressed={active === lng} title={LANGUAGE_NAMES[lng]} lang={lng}
          className={`px-2 py-1 text-[11px] font-semibold uppercase rounded-md transition-colors ${active === lng ? on : off}`}>
          {lng}
        </button>
      ))}
    </div>
  );
}
