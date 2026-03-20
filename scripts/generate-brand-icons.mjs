import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const sourceSvgPath = path.join(root, 'public', 'brand', 'final', 'chimera-icon-ce-on-dark.svg');
const outputDir = path.join(root, 'public', 'brand', 'final', 'icons');
const sizes = [32, 192, 512];

async function generateIcons() {
  const svg = await fs.readFile(sourceSvgPath, 'utf8');
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await page.goto(dataUrl, { waitUntil: 'load' });

  for (const size of sizes) {
    await page.setViewportSize({ width: size, height: size });
    await page.screenshot({
      path: path.join(outputDir, `icon-${size}.png`),
      omitBackground: false,
      clip: { x: 0, y: 0, width: size, height: size },
    });
  }

  await browser.close();
}

generateIcons().catch((error) => {
  console.error(error);
  process.exit(1);
});
