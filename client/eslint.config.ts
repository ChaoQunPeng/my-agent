import antfu from '@antfu/eslint-config';

export default antfu(
  {
    formatters: {
      css: true
    },
    ignores: [
      'types/auto-imports.d.ts',
      'types/components.d.ts',
      'public',
      'tsconfig.*.json',
      'tsconfig.json'
    ]
  },
  {
    rules: {
      'no-console': 0,
      'style/quote-props': 0,
      'unused-imports/no-unused-vars': 0,
      'ts/no-unused-expressions': 0,
      'style/semi': ['error', 'always'],
      'style/comma-dangle': ['error', 'never'],
      'style/member-delimiter-style': ['delimiter'],
      'jsonc/comma-dangle': ['error', 'never'],
      'vue/comma-dangle': ['error', 'never'],
      'brace-style': ['error']
    }
  }
);
