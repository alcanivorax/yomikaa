module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/src/generated/"],
  moduleNameMapper: {
    "^@marginalia/shared$": "<rootDir>/../../packages/shared/src/index.ts",
  },
};
