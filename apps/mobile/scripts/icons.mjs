import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, '../assets');

function buildLogoSvg({
  size,
  scalePct = 0.7,
  bgColor = null,
  mono = false,
}) {
  const logoW = Math.round(size * scalePct);
  const logoH = Math.round(logoW * (70 / 64));
  const offsetX = Math.round((size - logoW) / 2);
  const offsetY = Math.round((size - logoH) / 2);

  const shieldStroke = '#ffffff';
  const facetStroke = mono ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.45)';
  const mStroke = mono ? '#ffffff' : '#e5fe40';
  const shieldFill = mono ? 'none' : '#121212';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bgColor ? `<rect width="${size}" height="${size}" fill="${bgColor}" />` : ''}
  <svg x="${offsetX}" y="${offsetY}" width="${logoW}" height="${logoH}" viewBox="0 0 64 70" fill="none">
    <path
      d="M6 6h52v34c0 13-11 22-26 28C17 62 6 53 6 40V6z"
      fill="${shieldFill}"
      stroke="${shieldStroke}"
      stroke-width="2.5"
      stroke-linejoin="round"
    />
    <path
      d="M6 6l6 6h40l6-6"
      stroke="${facetStroke}"
      stroke-width="1.75"
      stroke-linejoin="round"
    />
    <path
      d="M19 50V22l13 16"
      stroke="${mStroke}"
      stroke-width="3.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M45 50V22L32 38"
      stroke="${mStroke}"
      stroke-width="3.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</svg>`;
}

async function main() {
  await fs.mkdir(assetsDir, { recursive: true });

  // 1. icon.png (1024, bg #0d0d0d, logo 70%)
  const iconSvg = buildLogoSvg({ size: 1024, scalePct: 0.7, bgColor: '#0d0d0d', mono: false });
  await sharp(Buffer.from(iconSvg)).png().toFile(path.join(assetsDir, 'icon.png'));

  // 2. adaptive-icon.png (1024 transparent, 66% safe zone -> scalePct ~0.56 so entire shield stays inside 66%)
  const adaptiveSvg = buildLogoSvg({ size: 1024, scalePct: 0.56, bgColor: null, mono: false });
  await sharp(Buffer.from(adaptiveSvg)).png().toFile(path.join(assetsDir, 'adaptive-icon.png'));

  // 3. adaptive-mono.png (1024 transparent white silhouette in 66% safe zone)
  const monoSvg = buildLogoSvg({ size: 1024, scalePct: 0.56, bgColor: null, mono: true });
  await sharp(Buffer.from(monoSvg)).png().toFile(path.join(assetsDir, 'adaptive-mono.png'));

  // 4. splash.png (512 logo only, transparent bg)
  const splashSvg = buildLogoSvg({ size: 512, scalePct: 0.78, bgColor: null, mono: false });
  await sharp(Buffer.from(splashSvg)).png().toFile(path.join(assetsDir, 'splash.png'));

  console.log('Generated assets/icon.png, adaptive-icon.png, adaptive-mono.png, splash.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
