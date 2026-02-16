import config from '@ai-daily/eslint-config';

export default [
  ...config,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['../../web/*', '../web/*', 'apps/web/*', '@ai-daily/web'],
        },
      ],
    },
  },
];
