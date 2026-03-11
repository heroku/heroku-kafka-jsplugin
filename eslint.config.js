import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    ignores: ['node_modules/**', '.nyc_output/**']
  },
  {
    files: ['**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.mocha
      }
    },
    rules: {
      'quotes': 'off',
      'semi': 'off',
      'quotes': ['error', 'single']
    }
  }
]
