module.exports = {
  extends: [
    'airbnb/hooks',
    'airbnb-typescript',
    'eslint:recommended',
    'prettier',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    'arrow-body-style': ['warn', 'as-needed'],
    'consistent-return': 'warn',
    'import/no-extraneous-dependencies': 'off',
    'import/newline-after-import': 'error',
    'import/order': [
      'error',
      {
        groups: [['builtin', 'external', 'internal']],
      },
    ],
    'import/prefer-default-export': 0,
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error'],
      },
    ],
    'no-var': 'warn',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/await-thenable': 'error',
    'object-shorthand': 'warn',
    'prefer-arrow-callback': 'warn',
    'prefer-const': 'warn',
    'prefer-spread': 'warn',
    'react/forbid-prop-types': [
      'error',
      {
        forbid: ['any'],
      },
    ],
    'react/jsx-props-no-spreading': 'off',
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-filename-extension': [
      1,
      {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    ],
    'react-hooks/rules-of-hooks': 'error',
    'react/default-props-match-prop-types': 'warn',
    'react/no-unused-prop-types': 'warn',
    'react/prefer-stateless-function': 'warn',
    'react/prop-types': 'warn',
    'react/require-default-props': 'off',
  },
  plugins: [
    'prettier',
    'react-hooks',
    '@typescript-eslint',
    'react',
    'jsx-a11y',
    'import',
  ],
  env: {
    browser: true,
    jest: true,
    node: true,
    es2020: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules/', 'src/'],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  parserOptions: {
    project: ['tsconfig.json', 'examples/example-react-vite/tsconfig.json'],
  },
};
