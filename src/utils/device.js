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
