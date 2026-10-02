// #24: rà soát changelog — biến (action, target) thô của BE thành câu tiếng Việt
// dễ đọc: dịch hành động, đổi UUID → tên người, ISO date → dd/MM/yyyy, tag → nhãn.
import { PHASE_TAG_META, RACI_META, type RaciRole, type User } from '../types';

export interface FormattedActivity {
  /** Cụm động từ tiếng Việt, vd "đã thêm người tham gia". */
  verb: string;
  /** Phần bổ nghĩa đã được làm sạch (tên/ngày/nhãn), hoặc null nếu không có. */
  detail: string | null;
}

type UserLookup = (id: string) => User | undefined;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Dịch hành động BE → tiếng Việt. Khóa là chuỗi `action` thô.
const VERB: Record<string, string> = {
  'created phase': 'đã tạo phase',
  'deleted phase': 'đã xóa phase',
  'renamed phase': 'đã đổi tên phase',
  'changed status': 'đã đổi trạng thái',
  'changed start date': 'đã đổi ngày bắt đầu',
  'changed end date': 'đã đổi ngày kết thúc',
  'reassigned phase': 'đã giao phase cho',
  'added participant': 'đã thêm người tham gia',
  'removed participant': 'đã gỡ người tham gia',
  'changed participant role': 'đã đổi vai trò RACI của',
  'added checklist': 'đã thêm mục checklist',
  'added outcome': 'đã thêm mục kết quả',
  'completed item': 'đã hoàn thành mục',
  'reopened item': 'đã mở lại mục',
  'edited item': 'đã sửa mục',
  'removed item': 'đã xóa mục',
  commented: 'đã bình luận',
  'removed document': 'đã gỡ tài liệu',
  'attached link': 'đã đính kèm link',
  'uploaded file': 'đã tải lên file',
  'created project': 'đã tạo dự án',
  'renamed project': 'đã đổi tên dự án',
  'deleted project': 'đã xóa dự án',
};

// Hành động mà `target` là 1 UUID người dùng cần đổi sang tên.
const USER_TARGET = new Set([
  'reassigned phase', 'added participant', 'removed participant', 'changed participant role',
]);
// #34: các hành động participant có hậu tố " — R|A|C|I" (vai trò RACI).
const RACI_TARGET = new Set(['added participant', 'removed participant', 'changed participant role']);
// Hành động mà `target` là "ISO → ISO".
const DATE_TARGET = new Set(['changed start date', 'changed end date']);

function resolveUser(id: string, getUserById: UserLookup): string {
  return getUserById(id)?.name ?? 'người dùng không xác định';
}

function viDate(iso: string): string {
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function viTag(value: string): string {
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
  const verb = VERB[action] ?? action;
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
      raci = ` (${RACI_META[m[2] as RaciRole].label})`;
    }
    const id = who.split(/\s|—/)[0].trim();
    const name = UUID_RE.test(id) ? resolveUser(id, getUserById) : who;
    return { verb: `${verb} ${name}${raci}`, detail: null };
  }

  if (DATE_TARGET.has(action)) {
    return { verb, detail: mapTransition(raw, viDate) };
  }

  if (action === 'changed status') {
    return { verb, detail: mapTransition(raw, viTag) };
  }

  // Mặc định: giữ nguyên target, nhưng vẫn quét & thay UUID lẻ nếu lỡ lọt vào.
  const cleaned = raw.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    (m) => resolveUser(m, getUserById),
  );
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
