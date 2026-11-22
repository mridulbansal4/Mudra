import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, '../assets');
const androidResDir = path.resolve(__dirname, '../android/app/src/main/res');

/**
 * Builds the Mudra Mark SVG (M-arch + acid-lime diamond) matching
 * `apps/web/public/brand/mudra-mark.svg`.
 */
function buildMudraMarkSvg({
  size,
  scalePct = 0.88,
  bgColor = null,
  includeSquircle = true,
  mono = false,
}) {
  const markSize = Math.round(size * scalePct);
  const offset = Math.round((size - markSize) / 2);

  const defs = mono
    ? ''
    : `<defs>
    <linearGradient id="bg" x1="12" y1="4" x2="52" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#26262b"/>
      <stop offset="48%" stop-color="#141417"/>
      <stop offset="100%" stop-color="#08080a"/>
    </linearGradient>
    <linearGradient id="rim" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.42"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.11"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.03"/>
    </linearGradient>
    <linearGradient id="arch" x1="18" y1="18" x2="46" y2="46" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="55%" stop-color="#e4e4e8"/>
      <stop offset="100%" stop-color="#a4a4ae"/>
    </linearGradient>
    <linearGradient id="key" x1="32" y1="32" x2="32" y2="45" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f0ff70"/>
      <stop offset="55%" stop-color="#e5fe40"/>
      <stop offset="100%" stop-color="#b8d916"/>
    </linearGradient>
    <radialGradient id="glow" cx="32" cy="38.5" r="14" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#e5fe40" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#e5fe40" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="clip">
      <path d="M32 4C51.5 4 60 12.5 60 32C60 51.5 51.5 60 32 60C12.5 60 4 51.5 4 32C4 12.5 12.5 4 32 4Z"/>
    </clipPath>
  </defs>`;

  const squircleLayer =
    includeSquircle && !mono
      ? `<path d="M32 4C51.5 4 60 12.5 60 32C60 51.5 51.5 60 32 60C12.5 60 4 51.5 4 32C4 12.5 12.5 4 32 4Z" fill="url(#bg)"/>
    <g clip-path="url(#clip)">
      <circle cx="32" cy="38.5" r="14" fill="url(#glow)"/>
    </g>
    <path d="M32 7.5C49 7.5 56.5 15 56.5 32C56.5 49 49 56.5 32 56.5C15 56.5 7.5 49 7.5 32C7.5 15 15 7.5 32 7.5Z" stroke="#ffffff" stroke-opacity="0.055" stroke-width="0.75"/>
    <path d="M32 4.5C51.1 4.5 59.5 12.9 59.5 32C59.5 51.1 51.1 59.5 32 59.5C12.9 59.5 4.5 51.1 4.5 32C4.5 12.9 12.9 4.5 32 4.5Z" stroke="url(#rim)" stroke-width="1.05"/>`
      : !mono
        ? `<circle cx="32" cy="38.5" r="14" fill="url(#glow)"/>`
        : '';

  const archStroke = mono ? '#ffffff' : 'url(#arch)';
  const keyFill = mono ? '#ffffff' : 'url(#key)';
  const keyHighlight = mono
    ? ''
    : '<path d="M32 32.8L35.4 36.8L32 35.8L28.6 36.8Z" fill="#ffffff" fill-opacity="0.45"/>';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bgColor ? `<rect width="${size}" height="${size}" fill="${bgColor}" />` : ''}
  <svg x="${offset}" y="${offset}" width="${markSize}" height="${markSize}" viewBox="0 0 64 64" fill="none">
    ${defs}
    ${squircleLayer}
    <path d="M17.5 44.5V24.8C17.5 19.6 22.6 17.8 26.3 21.5L32 27.2L37.7 21.5C41.4 17.8 46.5 19.6 46.5 24.8V44.5" stroke="${archStroke}" stroke-width="3.9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M32 32.3L37.2 38.4L32 44.5L26.8 38.4Z" fill="${keyFill}"/>
    ${keyHighlight}
  </svg>
</svg>`;
}

const ANDROID_DENSITIES = [
  { dir: 'mdpi', launcher: 48, adaptive: 108, splash: 288 },
  { dir: 'hdpi', launcher: 72, adaptive: 162, splash: 432 },
  { dir: 'xhdpi', launcher: 96, adaptive: 216, splash: 576 },
  { dir: 'xxhdpi', launcher: 144, adaptive: 324, splash: 864 },
  { dir: 'xxxhdpi', launcher: 192, adaptive: 432, splash: 1152 },
];

async function main() {
  await fs.mkdir(assetsDir, { recursive: true });

  // Expo source assets
  const iconPng = await sharp(
    Buffer.from(buildMudraMarkSvg({ size: 1024, scalePct: 0.9, bgColor: '#0d0d0d', includeSquircle: true }))
  ).png().toBuffer();
  await fs.writeFile(path.join(assetsDir, 'icon.png'), iconPng);

  const adaptiveFg = await sharp(
    Buffer.from(buildMudraMarkSvg({ size: 1024, scalePct: 0.72, bgColor: null, includeSquircle: false }))
  ).png().toBuffer();
  await fs.writeFile(path.join(assetsDir, 'adaptive-icon.png'), adaptiveFg);

  const adaptiveMono = await sharp(
    Buffer.from(buildMudraMarkSvg({ size: 1024, scalePct: 0.72, bgColor: null, includeSquircle: false, mono: true }))
  ).png().toBuffer();
  await fs.writeFile(path.join(assetsDir, 'adaptive-mono.png'), adaptiveMono);

  const splashPng = await sharp(
    Buffer.from(buildMudraMarkSvg({ size: 512, scalePct: 0.88, bgColor: null, includeSquircle: true }))
  ).png().toBuffer();
  await fs.writeFile(path.join(assetsDir, 'splash.png'), splashPng);

  // Prebuilt Android mipmap-* webp resources and drawable-* splashscreen_logo.png
  for (const { dir, launcher, adaptive, splash } of ANDROID_DENSITIES) {
    const mipmapDir = path.join(androidResDir, `mipmap-${dir}`);
    await fs.mkdir(mipmapDir, { recursive: true });

    await sharp(iconPng).resize(launcher, launcher).webp({ quality: 95 }).toFile(path.join(mipmapDir, 'ic_launcher.webp'));
    await sharp(iconPng).resize(launcher, launcher).webp({ quality: 95 }).toFile(path.join(mipmapDir, 'ic_launcher_round.webp'));
    await sharp(adaptiveFg).resize(adaptive, adaptive).webp({ quality: 95 }).toFile(path.join(mipmapDir, 'ic_launcher_foreground.webp'));
    await sharp(adaptiveMono).resize(adaptive, adaptive).webp({ quality: 95 }).toFile(path.join(mipmapDir, 'ic_launcher_monochrome.webp'));

    const drawableDir = path.join(androidResDir, `drawable-${dir}`);
    await fs.mkdir(drawableDir, { recursive: true });
    const splashLogoBuf = await sharp(
      Buffer.from(buildMudraMarkSvg({ size: splash, scalePct: 0.52, bgColor: null, includeSquircle: true }))
    ).png().toBuffer();
    await fs.writeFile(path.join(drawableDir, 'splashscreen_logo.png'), splashLogoBuf);
  }

  console.log('Generated Expo assets, Android mipmap-* icons, and drawable-* splashscreen_logo.png.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
