import config from '@ai-daily/eslint-config';

export default [
  ...config,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['../../api/*', '../api/*', 'apps/api/*', '@ai-daily/api'],
        },
      ],
    },
  },
];
