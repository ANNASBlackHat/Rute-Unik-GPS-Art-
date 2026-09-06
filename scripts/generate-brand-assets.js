const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 1. Vector Logo Design: Continuous GPS Track "R"
// Grid: 1024x1024
function createIconSvg({ isAdaptiveForeground = false } = {}) {
  const bg = isAdaptiveForeground
    ? ''
    : `<rect width="1024" height="1024" rx="224" fill="#1F2A1E"/>
       <!-- Topographic Elevation Contour Lines -->
       <g fill="none" stroke="#2B3A2A" stroke-width="14" opacity="0.65">
         <path d="M-50,300 Q260,180 520,340 T1080,260" />
         <path d="M-50,520 Q320,380 640,560 T1080,480" />
         <path d="M-50,740 Q220,600 580,780 T1080,700" />
       </g>
       <!-- Subtle Inner Border -->
       <rect x="24" y="24" width="976" height="976" rx="200" fill="none" stroke="#3A4D38" stroke-width="12" opacity="0.4"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
    ${bg}

    <!-- GPS Trail Marker Art Canvas -->
    <g id="gps-route-r" transform="translate(40, 20)">
      <!-- Soft Ambient Route Glow under the track -->
      <path
        d="M 330,760 L 330,300 C 330,190 490,190 580,260 C 670,330 660,450 560,500 L 330,500 M 520,490 L 680,760"
        fill="none"
        stroke="#E8562C"
        stroke-width="110"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.25"
      />

      <!-- Primary Route Track: Trail Orange (#E8562C) -->
      <path
        d="M 330,760 L 330,300 C 330,190 490,190 580,260 C 670,330 660,450 560,500 L 330,500 M 520,490 L 680,760"
        fill="none"
        stroke="#E8562C"
        stroke-width="78"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Inner Route Dash / Centerline (Topographic GPS style) -->
      <path
        d="M 330,760 L 330,300 C 330,190 490,190 580,260 C 670,330 660,450 560,500 L 330,500 M 520,490 L 680,760"
        fill="none"
        stroke="#F7F5EF"
        stroke-width="16"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-dasharray="24 28"
        opacity="0.92"
      />

      <!-- START Waypoint (Green Beacon at bottom left of stem) -->
      <circle cx="330" cy="760" r="48" fill="#10B981" stroke="#F7F5EF" stroke-width="14" />
      <circle cx="330" cy="760" r="18" fill="#F7F5EF" />

      <!-- MID-WAYPOINT / ART INTERSECTION (Waist of R) -->
      <circle cx="560" cy="500" r="28" fill="#F7F5EF" stroke="#1F2A1E" stroke-width="8" />
      <circle cx="560" cy="500" r="12" fill="#E8562C" />

      <!-- FINISH Waypoint (Outdoor Beacon at kick leg of R) -->
      <circle cx="680" cy="760" r="48" fill="#E8562C" stroke="#F7F5EF" stroke-width="14" />
      <circle cx="680" cy="760" r="20" fill="#F7F5EF" />
    </g>
  </svg>`;
}

function createSplashSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1242 2436" width="1242" height="2436">
    <rect width="1242" height="2436" fill="#1F2A1E"/>
    <!-- Subtle Topographic Contour Background -->
    <g fill="none" stroke="#283726" stroke-width="8" opacity="0.6">
      <circle cx="621" cy="1100" r="380" />
      <circle cx="621" cy="1100" r="500" stroke-dasharray="14 16" />
      <circle cx="621" cy="1100" r="620" />
    </g>

    <!-- Centered Logo Mark (scaled down to 500x500 at center) -->
    <g transform="translate(371, 850) scale(0.48)">
      <!-- Primary Route Track -->
      <path
        d="M 330,760 L 330,300 C 330,190 490,190 580,260 C 670,330 660,450 560,500 L 330,500 M 520,490 L 680,760"
        fill="none"
        stroke="#E8562C"
        stroke-width="84"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M 330,760 L 330,300 C 330,190 490,190 580,260 C 670,330 660,450 560,500 L 330,500 M 520,490 L 680,760"
        fill="none"
        stroke="#F7F5EF"
        stroke-width="18"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-dasharray="24 28"
        opacity="0.95"
      />
      <circle cx="330" cy="760" r="48" fill="#10B981" stroke="#F7F5EF" stroke-width="14" />
      <circle cx="330" cy="760" r="18" fill="#F7F5EF" />
      <circle cx="560" cy="500" r="28" fill="#F7F5EF" stroke="#1F2A1E" stroke-width="8" />
      <circle cx="560" cy="500" r="12" fill="#E8562C" />
      <circle cx="680" cy="760" r="48" fill="#E8562C" stroke="#F7F5EF" stroke-width="14" />
      <circle cx="680" cy="760" r="20" fill="#F7F5EF" />
    </g>

    <!-- Typographic Brand Lockup -->
    <text x="621" y="1420" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="64" fill="#F7F5EF" text-anchor="middle" letter-spacing="6">RUTE UNIK</text>
    <text x="621" y="1480" font-family="monospace" font-weight="700" font-size="24" fill="#C9BFA6" text-anchor="middle" letter-spacing="4">GPS ART RUNNING</text>
  </svg>`;
}

async function main() {
  const mobileAssetsDir = path.join(__dirname, '../apps/mobile/assets');
  const webPublicDir = path.join(__dirname, '../apps/web/public');

  if (!fs.existsSync(mobileAssetsDir)) {
    fs.mkdirSync(mobileAssetsDir, { recursive: true });
  }

  // 1. Generate icon.png (1024x1024)
  const iconSvg = createIconSvg({ isAdaptiveForeground: false });
  fs.writeFileSync(path.join(mobileAssetsDir, 'icon.svg'), iconSvg);
  fs.writeFileSync(path.join(webPublicDir, 'brand-logo.svg'), iconSvg);

  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(mobileAssetsDir, 'icon.png'));
  console.log('✅ Generated apps/mobile/assets/icon.png (1024x1024)');

  // 2. Generate adaptive-icon.png (1024x1024 with transparent bg for Android adaptive foreground)
  const adaptiveSvg = createIconSvg({ isAdaptiveForeground: true });
  await sharp(Buffer.from(adaptiveSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(mobileAssetsDir, 'adaptive-icon.png'));
  console.log('✅ Generated apps/mobile/assets/adaptive-icon.png (1024x1024)');

  // 3. Generate splash.png (1242x2436)
  const splashSvg = createSplashSvg();
  await sharp(Buffer.from(splashSvg))
    .resize(1242, 2436)
    .png()
    .toFile(path.join(mobileAssetsDir, 'splash.png'));
  console.log('✅ Generated apps/mobile/assets/splash.png (1242x2436)');

  // 4. Generate favicon.png (64x64)
  await sharp(Buffer.from(iconSvg))
    .resize(64, 64)
    .png()
    .toFile(path.join(mobileAssetsDir, 'favicon.png'));
  console.log('✅ Generated apps/mobile/assets/favicon.png (64x64)');
}

main().catch(console.error);
