/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  preset: 'ts-jest/presets/default-esm',
  transform: {
    '^.+\\.ts?$': [
      'ts-jest',
      { useESM: true },
    ],
  },
}
