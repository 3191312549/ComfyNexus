import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import i18next from 'eslint-plugin-i18next'
import tailwindcss from 'eslint-plugin-tailwindcss'
import { defineConfig, globalIgnores } from 'eslint/config'
import noChineseText from './eslint-rules/no-chinese-text.js'

export default defineConfig([
  globalIgnores([
    'dist',
    '**/__tests__/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/node_modules/**',
  ]),
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
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      tailwindcss: tailwindcss,
    },
    rules: {
      ...tailwindcss.configs.recommended.rules,
      'tailwindcss/no-custom-classname': ['warn', {
        whitelist: [
          'required',
          'changelog-markdown',
          'scrollbar-thin',
          'scrollbar-hide',
          'glass-card',
          'glass-card-top-border',
          'glass-toolbar',
          'glass-input',
          'status-badge',
          'badge-installed',
          'btn-glass',
          'page-btn',
          'meta-item',
          'meta-val',
          'modal-overlay',
          'modal-container',
          'pywebview-drag-region',
          'pywebview-no-drag',
          'resize-handle',
          'select-text',
          'select-none',
          'animate-in',
          'fade-in-0',
          'zoom-in-95',
          'slide-in-from-bottom-2',
          'text-white',
          'bg-white',
          'border-white',
          'text-black',
          'bg-black',
          'border-black',
          'duration-400',
          'drag-handle',
          'custom-home-page',
          'fade-in',
          'slide-in-from-top-2',
          'border-3',
        ],
        blacklist: [
          'text-(blue|red|green|yellow|orange|purple|gray|pink|indigo|cyan|teal|lime|amber|rose|fuchsia|violet|sky|emerald|slate|zinc|neutral|stone)-[0-9]+',
          'bg-(blue|red|green|yellow|orange|purple|gray|pink|indigo|cyan|teal|lime|amber|rose|fuchsia|violet|sky|emerald|slate|zinc|neutral|stone)-[0-9]+',
          'border-(blue|red|green|yellow|orange|purple|gray|pink|indigo|cyan|teal|lime|amber|rose|fuchsia|violet|sky|emerald|slate|zinc|neutral|stone)-[0-9]+',
        ],
      }],
      'tailwindcss/classnames-order': 'warn',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/components/ui/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name='button']",
          message: '禁止使用原生 button 标签，请从 @/components/ui 引入 Button 组件',
        },
        {
          selector: "JSXOpeningElement[name.name='input']",
          message: '禁止使用原生 input 标签，请从 @/components/ui 引入 Input 组件',
        },
        {
          selector: "JSXOpeningElement[name.name='select']",
          message: '禁止使用原生 select 标签，请从 @/components/ui 引入 NativeSelect 或 Select 组件',
        },
        {
          selector: "JSXOpeningElement[name.name='textarea']",
          message: '禁止使用原生 textarea 标签，请从 @/components/ui 引入 Textarea 组件',
        },
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}/]",
          message: '禁止使用硬编码 HEX 颜色值，请使用语义化颜色变量（如 text-primary, bg-danger 等）或 CSS 变量',
        },
        {
          selector: "Literal[value=/rgba?\\s*\\(/]",
          message: '禁止使用硬编码 RGB/RGBA 颜色值，请使用语义化颜色变量或 CSS 变量',
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}/]",
          message: '禁止在模板字符串中使用硬编码 HEX 颜色值，请使用语义化颜色变量或 CSS 变量',
        },
        {
          selector: "TemplateElement[value.raw=/rgba?\\s*\\(/]",
          message: '禁止在模板字符串中使用硬编码 RGB/RGBA 颜色值，请使用语义化颜色变量或 CSS 变量',
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/__tests__/**', '**/*.test.*', '**/*.spec.*'],
    plugins: {
      i18next: i18next,
    },
    rules: {
      'i18next/no-literal-string': ['error', {
        markupOnly: true,
        ignoreAttribute: [
          'className',
          'style',
          'type',
          'id',
          'name',
          'key',
          'variant',
          'size',
          'as',
          'asChild',
          'href',
          'src',
          'alt',
          'placeholder',
          'defaultValue',
          'value',
          'target',
          'rel',
          'role',
          'aria-label',
          'aria-labelledby',
          'aria-describedby',
          'aria-hidden',
          'data-testid',
          'action',
          'method',
          'enctype',
          'accept',
          'multiple',
          'disabled',
          'readonly',
          'required',
          'min',
          'max',
          'step',
          'pattern',
          'autocomplete',
          'autofocus',
          'form',
          'list',
          'spellcheck',
          'wrap',
          'cols',
          'rows',
          'width',
          'height',
          'color',
          'dir',
          'lang',
          'title',
          'slot',
        ],
        ignoreCallee: ['console', 'require', 'import', 't', 'i18n.t'],
        ignoreProperty: [
          'className',
          'style',
          'type',
          'id',
          'name',
          'key',
          'variant',
          'size',
          'testId',
          'data-testid',
        ],
      }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/__tests__/**', '**/*.test.*', '**/*.spec.*'],
    plugins: {
      'custom-rules': {
        rules: {
          'no-chinese-text': noChineseText,
        },
      },
    },
    rules: {
      'custom-rules/no-chinese-text': ['warn', {
        excludePatterns: [
          '^\\s*$',
          '^\\d+$',
        ],
        minLength: 2,
      }],
    },
  },
])
