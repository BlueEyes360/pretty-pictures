import { defineConfig, devices } from '@playwright/test';
import { createServer } from 'node:net';

// Pick a free loopback port, then pass it to workers through their inherited environment.
if (!process.env.PRETTY_PICTURES_TEST_PORT) {
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  process.env.PRETTY_PICTURES_TEST_PORT = String(socket.address().port);
  await new Promise(resolve => socket.close(resolve));
}
const port = process.env.PRETTY_PICTURES_TEST_PORT;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 3,
  timeout: 30000,
  expect: { timeout: 5000 },
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'output/e2e-results.json' }]],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: `node tests/support/browser-server.mjs --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
});
