import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config.js';

const port = process.env.PRETTY_PICTURES_TEST_PORT;
export default defineConfig({
  ...baseConfig,
  testDir: './tests/pages',
  outputDir: 'test-results-pages',
  use: { ...baseConfig.use, baseURL: `http://127.0.0.1:${port}/pretty-pictures/` },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-pages-report' }], ['json', { outputFile: 'output/pages-e2e-results.json' }]],
  webServer: { command: `node tests/support/pages-server.mjs ${port}`, url: `http://127.0.0.1:${port}/pretty-pictures/`, reuseExistingServer: false },
});
