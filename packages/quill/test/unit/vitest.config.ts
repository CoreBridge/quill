import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const unitRoot = resolve(__dirname).replaceAll('\\', '/');

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.js'],
  },
  test: {
    include: [`${unitRoot}/**/*.spec.ts`],
    typecheck: {
      enabled: true,
      include: [`${unitRoot}/**/*.test-d.ts`],
    },
    setupFiles: [
      `${unitRoot}/__helpers__/expect.ts`,
      `${unitRoot}/__helpers__/cleanup.ts`,
    ],
    browser: {
      enabled: true,
      provider: 'playwright',
      name: process.env.BROWSER || 'chromium',
    },
  },
});
