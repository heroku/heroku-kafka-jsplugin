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
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-return-await': 'warn',
      // 'perfectionist/sort-classes': 'off',
      // 'perfectionist/sort-interfaces': 'off',
      // 'perfectionist/sort-named-exports': 'off',
      // 'perfectionist/sort-object-types': 'off',
      'perfectionist/sort-switch-case': 'warn',
      // 'prefer-const': 'off',
      'prefer-rest-params': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
      'arrow-body-style': 'off',
      camelcase: 'off', // Allow snake_case for API parameters
      complexity: 'off',
      'dot-notation': 'off',
      eqeqeq: 'off',
      'import/no-duplicates': 'off',
      'import/no-unresolved': 'off', // TypeScript handles this
      'max-nested-callbacks': 'off',
      'mocha/max-top-level-suites': 'off',
      'n/no-missing-import': 'off', // TypeScript handles this
      'n/no-unsupported-features/es-syntax': 'off', // We use ESM
      'n/no-unsupported-features/node-builtins': 'off',
      'new-cap': 'off',
      'no-await-in-loop': 'off',
      'no-case-declarations': 'off',
      'no-control-regex': 'off',
      'no-else-return': 'off',
      'no-eq-null': 'off',
      'no-promise-executor-return': 'off',
      'no-prototype-builtins': 'off',
      'no-undef': 'off', // TypeScript handles this
      'object-shorthand': 'off',
      'perfectionist/sort-imports': 'off',
      'perfectionist/sort-named-imports': 'off',
      'perfectionist/sort-objects': 'off',
      'perfectionist/sort-union-types': 'off',
      'prefer-arrow-callback': 'off',
      'prefer-destructuring': 'off',
      'prefer-object-spread': 'off',
      quotes: 'off',
      radix: 'off',
      semi: 'off',
      'unicorn/catch-error-name': 'off',
      'unicorn/explicit-length-check': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/no-array-push-push': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-negated-condition': 'off',
      'unicorn/no-single-promise-in-promise-methods': 'off',
      'unicorn/no-zero-fractions': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/empty-brace-spaces': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/no-anonymous-default-export': 'off',
      'unicorn/no-hex-escape': 'off',
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
    },
  },
]
