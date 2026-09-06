/**
 * Single source of truth for Rute Unik Mobile App (Android APK) distribution.
 * 
 * To change the APK download URL, change it once here or specify
 * NEXT_PUBLIC_APK_DOWNLOAD_URL in your environment variables.
 */
export const APK_DOWNLOAD_CONFIG = {
  // Direct Expo APK download link or EAS build artifact URL
  downloadUrl:
    process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ||
    'https://expo.dev/artifacts/eas/rute-unik-latest.apk',
  // Expo Project / Builds Page fallback link
  expoProjectUrl:
    'https://expo.dev/projects/261536ce-2510-43b8-b95a-d8df294bb8e2',
  version: '1.0.0',
  buildType: 'Direct APK (Expo EAS Build)',
  // Whether the APK download feature & warnings are enabled
  // If downloadUrl is empty or falsy, download buttons and warning modals are gracefully disabled
  isEnabled: Boolean(
    process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
      'https://expo.dev/artifacts/eas/rute-unik-latest.apk'
  ),
} as const;
