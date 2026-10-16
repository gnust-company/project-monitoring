// #24: rà soát changelog — biến (action, target) thô của BE thành câu dễ đọc theo ngôn ngữ
// đang chọn (#29): dịch hành động, đổi UUID → tên người, ISO date → ngày hiển thị, tag → nhãn.
import { PHASE_TAG_META, type RaciRole, type User } from '../types';
import i18n from '../i18n';
import { formatDate } from '../i18n/format';
import type vi from '../i18n/locales/vi';

export interface FormattedActivity {
  /** Cụm động từ, vd "đã thêm người tham gia" / "added participant". */
  verb: string;
  /** Phần bổ nghĩa đã được làm sạch (tên/ngày/nhãn), hoặc null nếu không có. */
  detail: string | null;
}

type UserLookup = (id: string) => User | undefined;
type VerbKey = keyof typeof vi.activity.verbs;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// `action` thô của BE → khóa dịch trong activity.verbs.
const VERB: Record<string, VerbKey> = {
  'created phase': 'createdPhase',
  'deleted phase': 'deletedPhase',
  'renamed phase': 'renamedPhase',
  'changed status': 'changedStatus',
  'changed start date': 'changedStartDate',
  'changed end date': 'changedEndDate',
  'reassigned phase': 'reassignedPhase',
  'added participant': 'addedParticipant',
  'removed participant': 'removedParticipant',
  'changed participant role': 'changedParticipantRole',
  'added checklist': 'addedChecklist',
  'added outcome': 'addedOutcome',
  'completed item': 'completedItem',
  'reopened item': 'reopenedItem',
  'edited item': 'editedItem',
  'removed item': 'removedItem',
  commented: 'commented',
  'removed document': 'removedDocument',
  'attached link': 'attachedLink',
  'uploaded file': 'uploadedFile',
  'created project': 'createdProject',
  'renamed project': 'renamedProject',
  'deleted project': 'deletedProject',
};

// Hành động mà `target` là 1 UUID người dùng cần đổi sang tên.
const USER_TARGET = new Set([
  'reassigned phase', 'added participant', 'removed participant', 'changed participant role',
]);
// #34: các hành động participant có hậu tố " — R|A|C|I" (vai trò RACI).
const RACI_TARGET = new Set(['added participant', 'removed participant', 'changed participant role']);
// Hành động mà `target` là "ISO → ISO".
const DATE_TARGET = new Set(['changed start date', 'changed end date']);
// BE ghi lý do xóa vào target dạng "<tên> — lý do: <lý do>" (dữ liệu cũ & hiện tại).
const REASON_RE = /\s—\s(?:lý do|reason):\s/i;

function resolveUser(id: string, getUserById: UserLookup): string {
  return getUserById(id)?.name ?? i18n.t('activity.unknownUser');
}

function isoDate(iso: string): string {
  const v = iso.trim();
  return /^\d{4}-\d{2}-\d{2}/.test(v) ? formatDate(v.slice(0, 10)) : v;
}

function tagLabel(value: string): string {
  const v = value.trim();
  return (PHASE_TAG_META as Record<string, { label: string }>)[v]?.label ?? v;
}

function mapTransition(target: string, fn: (side: string) => string): string {
  const parts = target.split('→');
  if (parts.length !== 2) return target;
  return `${fn(parts[0])} → ${fn(parts[1])}`;
}

export function formatActivity(
  action: string,
  target: string,
  getUserById: UserLookup,
): FormattedActivity {
  const key = VERB[action];
  const verb = key ? i18n.t(`activity.verbs.${key}`) : action;
  const raw = (target ?? '').trim();
  if (!raw) return { verb, detail: null };

  if (USER_TARGET.has(action)) {
    // target là UUID người dùng → gộp tên vào verb cho đọc tự nhiên
    // ("đã thêm người tham gia Nguyễn A"), không dùng dấu " — ".
    let who = raw;
    let raci = '';
    const m = RACI_TARGET.has(action) ? raw.match(/^(.*?)\s+—\s+([RACI])$/) : null;
    if (m) {
      who = m[1].trim();
      raci = ` (${i18n.t(`raci.${m[2] as RaciRole}.label`)})`;
    }
    const id = who.split(/\s|—/)[0].trim();
    const name = UUID_RE.test(id) ? resolveUser(id, getUserById) : who;
    return { verb: `${verb} ${name}${raci}`, detail: null };
  }

  if (DATE_TARGET.has(action)) {
    return { verb, detail: mapTransition(raw, isoDate) };
  }

  if (action === 'changed status') {
    return { verb, detail: mapTransition(raw, tagLabel) };
  }

  // Mặc định: giữ nguyên target, nhưng vẫn quét & thay UUID lẻ nếu lỡ lọt vào,
  // và dịch nhãn "lý do:" của các bản ghi xóa.
  const cleaned = raw
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      (m) => resolveUser(m, getUserById),
    )
    .replace(REASON_RE, ` — ${i18n.t('activity.reason')}: `);
  return { verb, detail: cleaned };
}

// Tiện ích cho test/hiển thị 1 dòng (không gồm tên người thực hiện).
export function formatActivityLine(
  action: string,
  target: string,
  getUserById: UserLookup,
): string {
  const { verb, detail } = formatActivity(action, target, getUserById);
  return detail ? `${verb} — ${detail}` : verb;
}
