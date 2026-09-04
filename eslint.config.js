import eslintJs from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tsEslint from 'typescript-eslint';

export default [
  // Directories ignored by ESLint
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**'],
  },

  // Recommended JavaScript configuration
  eslintJs.configs.recommended,

  // Recommended TypeScript configuration
  ...tsEslint.configs.recommended,

  // Disables rules that conflict with Prettier
  prettierConfig,

  // Recommended rules from the Prettier plugin
  prettierPlugin,

  // Language and global environment settings
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },

    // Prettier custom rules
    rules: {
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          trailingComma: 'all',
          bracketSpacing: true,
          bracketSameLine: false,
          tabWidth: 2,
          endOfLine: 'auto',
        },
      ],
    },
  },
];
