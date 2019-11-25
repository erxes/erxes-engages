module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  testRegex: '/__tests__/.*\\.(ts|js)$',
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.json',
    },
  },
  testEnvironment: 'node',
  testPathIgnorePatterns: ['setup.ts', 'factories.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};
