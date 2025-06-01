module.exports = {
    preset: "ts-jest",
    testEnvironment: "jsdom",
    roots: ["<rootDir>/tests"],
    setupFilesAfterEnv: ["<rootDir>/tests/setup_tests.js"],
};
