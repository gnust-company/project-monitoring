// #29: BE lưu loại thông báo + tham số (params) → FE tự ghép câu theo ngôn ngữ đang chọn.
// Thông báo cũ (trước #29, không có params) hoặc loại lạ → dùng nguyên `title` BE đã lưu.
import i18n from '../i18n';
import vi from '../i18n/locales/vi';
import type { Notification } from '../types';

type NotificationType = keyof typeof vi.notifications.types;

function isKnownType(type: string): type is NotificationType {
  return type in vi.notifications.types;
}

export function notificationText(n: Notification): string {
  if (!n.params || !isKnownType(n.type)) return n.title;
  return i18n.t(`notifications.types.${n.type}`, { replace: n.params });
}
