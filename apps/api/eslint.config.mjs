import config from '@ai-daily/eslint-config';

export default [
  ...config,
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: false },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: ['../../web/*', '../web/*', 'apps/web/*', '@ai-daily/web'],
        },
      ],
    },
  },
  {
    files: ['src/**/*.test.ts', 'src/**/*.integration.test.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
];
