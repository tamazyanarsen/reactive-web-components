export default {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/src/shared/$1'
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            useESM: true
        }]
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    extensionsToTreatAsEsm: ['.ts'],
    moduleDirectories: ['node_modules', '<rootDir>']
}; 