// Chuỗi dùng chung toàn app (tiếng Việt). Khóa có `_one`/`_other` là dạng số nhiều của i18next:
// tiếng Việt không chia số nhiều nên hai dạng giống nhau (vẫn khai báo đủ để bản EN cùng cấu trúc).
const common = {
  common: {
    add: 'Thêm',
    all: 'Tất cả',
    back: 'Quay lại',
    cancel: 'Hủy',
    choose: 'Chọn...',
    close: 'Đóng',
    continue: 'Tiếp tục',
    delete: 'Xóa',
    deleting: 'Đang xóa…',
    done: 'Xong',
    edit: 'Sửa',
    finish: 'Hoàn tất',
    language: 'Ngôn ngữ',
    loading: 'Đang tải…',
    retry: 'Thử lại',
    revert: 'Hoàn tác',
    save: 'Lưu',
    saving: 'Đang lưu…',
    someone: 'Ai đó',
    user: 'Người dùng',
    unsavedChanges: 'Có thay đổi chưa lưu',
    percentDone: '{{pct}}% hoàn thành',
    projectCount_one: '{{count}} dự án',
    projectCount_other: '{{count}} dự án',
    memberCount_one: '{{count}} thành viên',
    memberCount_other: '{{count}} thành viên',
  },

  nav: {
    dashboard: 'Dashboard',
    pipeline: 'Pipeline',
    team: 'Nhóm',
    profile: 'Hồ sơ',
    settings: 'Cài đặt Workspace',
    workspaces: 'Workspaces',
  },

  userMenu: {
    profile: 'Hồ sơ của tôi',
    switchWorkspace: 'Chuyển Workspace',
    myWorkspaces: 'Workspaces của tôi',
    admin: 'Bảng quản trị',
    logout: 'Đăng xuất',
  },

  time: {
    justNow: 'vừa xong',
    today: 'Hôm nay',
    yesterday: 'Hôm qua',
    minutesAgo_one: '{{count}} phút trước',
    minutesAgo_other: '{{count}} phút trước',
    hoursAgo_one: '{{count}} giờ trước',
    hoursAgo_other: '{{count}} giờ trước',
    daysAgo_one: '{{count}} ngày trước',
    daysAgo_other: '{{count}} ngày trước',
  },

  projectStatus: {
    onTrack: 'Đúng tiến độ',
    atRisk: 'Có rủi ro',
    delayed: 'Chậm tiến độ',
  },

  // Tên màu trong bảng màu phase/role (PHASE_PALETTE).
  colors: {
    gray: 'Xám',
    cyan: 'Lục lam',
    violet: 'Tím',
    blue: 'Xanh dương',
    orange: 'Cam',
    emerald: 'Lục',
    slate: 'Đá',
    rose: 'Hồng',
    amber: 'Hổ phách',
    teal: 'Xanh mòng két',
  },

  raci: {
    R: { label: 'Thực hiện', hint: 'Trực tiếp làm' },
    A: { label: 'Chịu trách nhiệm', hint: 'Chịu trách nhiệm cuối/duyệt' },
    C: { label: 'Tham vấn', hint: 'Được hỏi ý kiến' },
    I: { label: 'Được thông báo', hint: 'Chỉ cần nắm tình hình' },
    external: 'ngoài',
    externalTitle: '{{name}} (ngoài nền tảng)',
    externalLabel: 'Người ngoài nền tảng — nhập tên',
    externalPlaceholder: 'VD: Nguyễn Văn A (khách hàng)',
    add: 'Thêm người ({{role}})',
    remove: 'Xóa {{name}}',
    allAdded: 'Đã thêm đủ thành viên workspace.',
  },

  filter: {
    button: 'Bộ lọc',
    onlyMine: 'Chỉ dự án của tôi',
    onlyMineHint: 'PIC hoặc phase bạn tham gia',
    dateRange: 'Khoảng thời gian',
    clearRange: 'Xóa',
    clearAll: 'Bỏ tất cả bộ lọc',
  },

  notifications: {
    title: 'Thông báo',
    newCount: '{{count}} mới',
    empty: 'Chưa có thông báo',
    markAllRead: 'Đánh dấu tất cả đã đọc',
    // Câu thông báo theo `type` + `params` từ BE (#29).
    types: {
      phase_assigned: 'Bạn được giao phase {{phase}}',
      project_pic_changed: 'Bạn được chỉ định làm PIC dự án {{project}}',
      member_added: 'Bạn được thêm vào workspace {{workspace}}',
      member_removed: 'Bạn đã bị xóa khỏi workspace {{workspace}}',
      comment_added: 'Bình luận mới ở phase {{phase}}',
      change_request_approved: 'Yêu cầu của bạn đã được duyệt',
      change_request_rejected: 'Yêu cầu của bạn đã bị từ chối',
    },
  },

  // Lịch sử thay đổi: action thô của BE → cụm động từ (lib/formatActivity.ts).
  activity: {
    verbs: {
      createdPhase: 'đã tạo phase',
      deletedPhase: 'đã xóa phase',
      renamedPhase: 'đã đổi tên phase',
      changedStatus: 'đã đổi trạng thái',
      changedStartDate: 'đã đổi ngày bắt đầu',
      changedEndDate: 'đã đổi ngày kết thúc',
      reassignedPhase: 'đã giao phase cho',
      addedParticipant: 'đã thêm người tham gia',
      removedParticipant: 'đã gỡ người tham gia',
      changedParticipantRole: 'đã đổi vai trò RACI của',
      addedChecklist: 'đã thêm mục checklist',
      addedOutcome: 'đã thêm mục kết quả',
      completedItem: 'đã hoàn thành mục',
      reopenedItem: 'đã mở lại mục',
      editedItem: 'đã sửa mục',
      removedItem: 'đã xóa mục',
      commented: 'đã bình luận',
      removedDocument: 'đã gỡ tài liệu',
      attachedLink: 'đã đính kèm link',
      uploadedFile: 'đã tải lên file',
      createdProject: 'đã tạo dự án',
      renamedProject: 'đã đổi tên dự án',
      deletedProject: 'đã xóa dự án',
    },
    reason: 'lý do',
    unknownUser: 'người dùng không xác định',
  },

  deleteDialog: {
    reason: 'Lý do xóa',
    placeholder: 'Nhập lý do (sẽ được ghi vào lịch sử)…',
  },

  upload: {
    title: 'Tải tệp lên',
    dropzone: 'Kéo-thả tệp vào đây, hoặc <pick>chọn từ máy</pick>',
    multiple: 'Có thể chọn nhiều tệp cùng lúc',
    remove: 'Bỏ',
    failed: 'Tải thất bại',
    retryHint: 'Tải thất bại — bấm xác nhận để thử lại',
    summary_one: '{{count}} tệp · {{done}} xong',
    summary_other: '{{count}} tệp · {{done}} xong',
    finish: 'Hoàn tất',
    uploading: 'Đang tải…',
    confirm: 'Xác nhận tải lên',
    confirmCount: 'Xác nhận tải lên ({{count}})',
  },

  // Lỗi 422 do FastAPI kiểm tra dữ liệu (api/client.ts).
  validation: {
    fields: {
      email: 'Email',
      password: 'Mật khẩu',
      name: 'Họ tên',
      title: 'Tiêu đề',
      data: 'Dữ liệu',
    },
    missing: 'Vui lòng nhập {{field}}.',
    tooShort: '{{field}} quá ngắn (tối thiểu {{min}} ký tự).',
    tooLong: '{{field}} quá dài (tối đa {{max}} ký tự).',
    invalid: '{{field}} không hợp lệ.',
  },

  // Lỗi: phần chung của FE + mã lỗi BE (errors.<code>, xem docs/API_CONTRACT.md).
  errors: {
    generic: 'Có lỗi xảy ra',
    network: 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.',
    saveFailed: 'Lưu thất bại',
    deleteFailed: 'Xóa thất bại',
    noWorkspace: 'Chưa chọn workspace',
    auth: {
      not_authenticated: 'Bạn cần đăng nhập để tiếp tục.',
      invalid_token: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      user_not_found: 'Tài khoản không còn tồn tại. Vui lòng đăng nhập lại.',
      superuser_required: 'Chỉ admin hệ thống mới thực hiện được thao tác này.',
      setup_done: 'Hệ thống đã được thiết lập.',
      email_taken: 'Email này đã được đăng ký.',
      email_domain_not_allowed: 'Email phải thuộc domain được phép: {{domains}}.',
      invalid_credentials: 'Email hoặc mật khẩu không đúng.',
      wrong_password: 'Mật khẩu hiện tại không đúng.',
    },
    workspace: {
      not_found: 'Không tìm thấy workspace.',
      not_member: 'Bạn không phải thành viên của workspace này.',
      owner_required: 'Chỉ chủ workspace mới thực hiện được thao tác này.',
      member_email_not_found: 'Không có tài khoản nào dùng email này.',
    },
    project: {
      not_found: 'Không tìm thấy dự án.',
      forbidden_edit: 'Chỉ PIC (hoặc admin) mới được sửa dự án này.',
      forbidden_delete: 'Chỉ PIC (hoặc admin) mới được xóa dự án này.',
      forbidden_pic: 'Bạn không có quyền đổi PIC dự án này.',
    },
    phase: {
      not_found: 'Không tìm thấy phase.',
      forbidden_edit: 'Chỉ PIC phase mới được sửa.',
      forbidden_delete: 'Chỉ PIC phase mới được xóa.',
      item_not_found: 'Không tìm thấy mục này.',
      outcome_needs_attachment: 'Outcome cần đính kèm ít nhất 1 tài liệu/link trước khi đánh dấu hoàn thành.',
      attachment_not_found: 'Không tìm thấy tài liệu.',
    },
    phase_def: {
      not_found: 'Không tìm thấy phase.',
      code_conflict: 'Mã phase “{{code}}” đã tồn tại.',
      in_use_one: 'Có {{count}} phase block đang dùng phase này.',
      in_use_other: 'Có {{count}} phase block đang dùng phase này.',
    },
    role: {
      not_found: 'Vai trò không tồn tại trong workspace.',
      code_conflict: 'Mã vai trò “{{code}}” đã tồn tại.',
      forbidden: 'Không có quyền đổi vai trò này.',
    },
    user: {
      not_found: 'Không tìm thấy người dùng.',
      cannot_change_own_admin: 'Không thể tự đổi quyền admin của chính mình.',
      cannot_delete_self: 'Không thể tự xóa tài khoản của mình ở đây.',
    },
    announcement: {
      not_found: 'Không tìm thấy thông báo.',
      window_required: 'Cần khoảng thời gian hiển thị.',
      window_order: 'Thời điểm bắt đầu phải trước kết thúc.',
      invalid_scope: 'Thời hạn ẩn không hợp lệ.',
    },
    notification: {
      not_found: 'Không tìm thấy thông báo.',
    },
    change_request: {
      not_found: 'Không tìm thấy yêu cầu thay đổi.',
      resolved: 'Yêu cầu này đã được xử lý.',
    },
  },
};

export default common;
