import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.test.js',
  version: '1.104.0',
  platform: 'desktop',
  mocha: {
    ui: 'tdd',
    timeout: 20000,
    slow: 2000,
    reporter: 'spec',
    retries: 1
  },
  coverage: {
    enabled: false, // Can be enabled when c8 is added
    include: ['out/src/**/*.js'],
    exclude: ['out/test/**', 'out/src/test/**']
  }
});
