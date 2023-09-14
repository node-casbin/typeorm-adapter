module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
  },
  rules: {
    'max-classes-per-file': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    'no-console': 'off',
    'arrow-parens': 'off',
    'ordered-imports': 'off',
    'object-literal-sort-keys': 'off',
    'no-empty': 'off',
    'quotes': ['error', 'single'],
    'comma-dangle': 'off',
    'max-len': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
  },
};
