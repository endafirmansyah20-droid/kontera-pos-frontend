// Deteksi apakah device saat ini mobile (HP/handheld) vs desktop/laptop.
// Primer: User-Agent Client Hints (navigator.userAgentData.mobile) — tidak bisa
// di-spoof oleh "Desktop site" mode di Chrome mobile.
// Fallback: regex UA klasik untuk browser yang belum support UA-CH.
export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
    return navigator.userAgentData.mobile;
  }
  return /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(navigator.userAgent || '');
}

export function isAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

// iPadOS 13+ melaporkan diri sebagai Mac di UA. Fallback ke platform + touchpoints
// untuk membedakan iPad dari Mac desktop asli (Mac tidak punya touchscreen).
export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
}

// Safari asli (bukan Chrome/Firefox iOS yang tetap pakai WebKit tapi UA berbeda).
// Add to Home Screen di iOS hanya jalan di Safari asli.
export function isSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) && !/Chrome/.test(ua);
}

// App sedang berjalan sebagai PWA standalone (di-install ke Home Screen /
// desktop), bukan dari tab browser biasa.
// iOS pakai `navigator.standalone` non-standard; platform lain pakai
// media query display-mode.
export function isStandalonePWA() {
  if (typeof window === 'undefined') return false;
  if (window.navigator && window.navigator.standalone === true) return true;
  return !!window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
}
