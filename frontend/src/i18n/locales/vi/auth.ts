// Đăng nhập / đăng ký / thiết lập lần đầu / chọn workspace / thông báo hệ thống (tiếng Việt).
const auth = {
  auth: {
    login: {
      title: 'Đăng nhập',
      subtitle: 'Chào mừng trở lại! Nhập thông tin để tiếp tục.',
      remember: 'Ghi nhớ đăng nhập',
      forgot: 'Quên mật khẩu?',
      submit: 'Đăng nhập',
      createAccount: 'Tạo tài khoản mới',
      failed: 'Đăng nhập thất bại',
    },
    register: {
      title: 'Đăng ký',
      subtitle: 'Tạo tài khoản để bắt đầu sử dụng ProjectHub.',
      submit: 'Đăng ký',
      haveAccount: 'Đã có tài khoản? Đăng nhập',
      failed: 'Đăng ký thất bại',
      emailTaken: 'Email này đã được đăng ký. Vui lòng đăng nhập.',
    },
    fields: {
      name: 'Họ tên',
      namePlaceholder: 'Nguyễn Văn A',
      password: 'Mật khẩu',
      passwordHint: 'Tối thiểu 6 ký tự',
      confirmPassword: 'Xác nhận mật khẩu',
      confirmPlaceholder: 'Nhập lại mật khẩu',
    },
    validation: {
      emailRequired: 'Vui lòng nhập email.',
      emailInvalid: 'Email không đúng định dạng (ví dụ: ten@congty.com).',
      passwordRequired: 'Vui lòng nhập mật khẩu.',
      nameRequired: 'Vui lòng nhập họ tên.',
      passwordMin: 'Mật khẩu tối thiểu 6 ký tự.',
      passwordMismatch: 'Mật khẩu không khớp.',
    },
    invalidCredentials: 'Email hoặc mật khẩu không đúng.',
    or: 'hoặc',
    backHome: 'Về trang chủ',
    setup: {
      badge: 'Thiết lập lần đầu',
      title: 'Tạo tài khoản quản trị',
      lead: 'Hệ thống chưa có tài khoản nào. Tài khoản đầu tiên sẽ là <strong>admin toàn quyền</strong>.',
      passwordPlaceholder: 'Mật khẩu (tối thiểu 6 ký tự)',
      submit: 'Tạo & bắt đầu',
    },
  },

  selector: {
    home: 'Trang chủ',
    title: 'Chọn Workspace',
    subtitle: 'Chọn tổ chức để quản lý dự án của bạn',
    create: 'Tạo Workspace mới',
  },

  // Modal thông báo hệ thống bật lên khi đăng nhập (#27).
  announcement: {
    title: 'Thông báo',
    hideToday: 'Không hiện lại hôm nay',
    hideWeek: 'Không hiện lại tuần này',
  },
};

export default auth;
