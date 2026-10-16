// Bản dịch tiếng Việt — gốc kiểu cho mọi ngôn ngữ khác (en phải có đúng các khóa này).
// Landing không nằm ở đây (nội dung có cấu trúc, dùng useLanding()).
import common from './common';
import auth from './auth';
import workspace from './workspace';
import admin from './admin';

const vi = { ...common, ...auth, ...workspace, ...admin };

export type Translation = typeof vi;
export default vi;
