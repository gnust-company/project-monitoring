import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // eslint-plugin-react-hooks v7 bật bộ rule "react-compiler" ở mức error. Ba rule dưới
      // bắt cả pattern React hợp lệ (reset/đồng bộ state cục bộ khi đổi target trong effect;
      // đo ref; Date.now/Math.random cho thời-gian-tương-đối & skeleton) → để 'warn' (hiện
      // nhưng không chặn) thay vì rewrite logic đang chạy đúng. Lỗi chất lượng thật
      // (any/unused/empty-type) vẫn được fix trong code.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  {
    // shadcn/ui là primitive "vendored": fast-refresh (export kèm cva variants) không áp
    // dụng cho loại code thư viện này.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Context: Provider (component) + hook useApp đặt chung file là pattern chuẩn React Context.
    files: ['src/context/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
