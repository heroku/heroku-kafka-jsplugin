import oclifConfig from 'eslint-config-oclif'
import globals from 'globals'

export default [
  {
    ignores: ['node_modules/**', '.nyc_output/**', 'dist/**', '**/*.d.ts', 'types/**', 'workflows-repo/**'],
  },
  ...oclifConfig,
  {
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
      parserOptions: {
        // Test files sit outside tsconfig.json's `include` (deliberately, so
        // `tsc`/`npm run build` never compiles test/**). eslint-config-xo>=0.58
        // (pulled in via eslint-config-oclif@7) turns on typescript-eslint's
        // project service by default, which otherwise refuses to parse files
        // outside any known tsconfig project. `**` globs are disallowed here
        // as a footgun guard, so list each test directory explicitly.
        projectService: {
          allowDefaultProject: [
            'test/*.ts',
            'test/commands/kafka/*.ts',
            'test/commands/kafka/consumer-groups/*.ts',
            'test/commands/kafka/topics/*.ts',
            'test/helpers/*.ts',
            'test/lib/*.ts',
          ],
          // This repo's whole test/ tree (~25 small files) matches the globs
          // above; the tseslint default cap of 8 exists for repos where a wide
          // glob accidentally captures the entire src tree. Raise it to fit.
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 50,
        },
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
      'no-promise-executor-return': 'warn',
      'no-prototype-builtins': 'warn',
      'no-return-await': 'warn',
      'perfectionist/sort-objects': 'off',
      'perfectionist/sort-switch-case': 'off',
      'perfectionist/sort-union-types': 'off',
      radix: 'warn',
      'unicorn/consistent-function-scoping': 'warn',
      'unicorn/no-anonymous-default-export': 'warn',
      'unicorn/no-array-callback-reference': 'warn',
      'unicorn/no-for-each': 'warn',
      'unicorn/no-array-reduce': 'warn',
      'unicorn/prefer-single-call': 'warn',
      'unicorn/no-negated-condition': 'warn',
      'unicorn/no-single-promise-in-promise-methods': 'warn',
      'unicorn/no-zero-fractions': 'off',
      'unicorn/prefer-at': 'off',
      'unicorn/prefer-number-properties': 'warn',
      'unicorn/prefer-string-replace-all': 'warn',
      'unicorn/prefer-ternary': 'off',
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in tests (stubs, mocks, etc)
      'prefer-arrow-callback': 'off',
      'mocha/max-top-level-suites': 'warn',
    },
  },
]
