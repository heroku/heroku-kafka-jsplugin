import oclifConfig from 'eslint-config-oclif'
import globals from 'globals'

export default [
  {
    ignores: ['node_modules/**', '.nyc_output/**', 'dist/**', '**/*.d.ts', 'types/**'],
  },
  ...oclifConfig,
  {
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
    rules: {
      '@stylistic/indent-binary-ops': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-unused-expressions': 'off',
      'arrow-body-style': 'warn',
      camelcase: 'off', // Allow snake_case for API parameters
      'max-nested-callbacks': 'warn',
      'n/no-unsupported-features/node-builtins': 'warn',
      'no-await-in-loop': 'warn',
      'no-control-regex': 'warn',
      // 'no-else-return': 'off',
      // 'no-eq-null': 'off',
      'no-promise-executor-return': 'warn',
      'no-prototype-builtins': 'warn',
      'no-return-await': 'warn',
      // 'no-undef': 'off', // TypeScript handles this
      // 'object-shorthand': 'off',
      // 'perfectionist/sort-imports': 'off',
      // 'perfectionist/sort-named-imports': 'off',
      'perfectionist/sort-objects': 'off',
      'perfectionist/sort-switch-case': 'off',
      'perfectionist/sort-union-types': 'off',
      'prefer-arrow-callback': 'off',
      'prefer-destructuring': 'off',
      'prefer-object-spread': 'off',
      quotes: 'off',
      radix: 'off',
      semi: 'off',
      'unicorn/catch-error-name': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/empty-brace-spaces': 'off',
      'unicorn/explicit-length-check': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/no-anonymous-default-export': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/no-array-push-push': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-hex-escape': 'off',
      'unicorn/no-negated-condition': 'off',
      'unicorn/no-single-promise-in-promise-methods': 'off',
      'unicorn/no-zero-fractions': 'off',
      'unicorn/numeric-separators-style': 'off',
      'unicorn/prefer-at': 'off',
      'unicorn/prefer-default-parameters': 'off',
      'unicorn/prefer-includes': 'off',
      'unicorn/prefer-number-properties': 'off',
      'unicorn/prefer-optional-catch-binding': 'off',
      'unicorn/prefer-string-replace-all': 'off',
      'unicorn/prefer-ternary': 'off',
      'unicorn/switch-case-braces': 'off',
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in tests (stubs, mocks, etc)
      'arrow-body-style': 'off',
      'mocha/max-top-level-suites': 'warn',
    },
  },
]
