const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
  {
    ignores: ['node_modules/**', '.nyc_output/**']
  },
  {
    files: ['**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
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
