module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: {
    '^@lib/(.*)$': '<rootDir>/libs/$1/src/index.ts'
  },
  roots: [
    '<rootDir>/services/api',
    '<rootDir>/services/scanner',
    '<rootDir>/libs/scoring',
    '<rootDir>/libs/risk',
    '<rootDir>/libs/rug',
    '<rootDir>/libs/gad-score',
    '<rootDir>/libs/narrative',
    '<rootDir>/libs/survival',
    '<rootDir>/libs/dna',
    '<rootDir>/libs/social',
    '<rootDir>/libs/alerts',
    '<rootDir>/libs/lifecycle',
    '<rootDir>/libs/opportunity',
    '<rootDir>/libs/memory',
    '<rootDir>/libs/regime',
    '<rootDir>/libs/reputation',
  ]
};
