/// Browser E2EE capability detection for LiveKit.
/// Returns true on Chrome/Edge (Insertable Streams API), false on Safari/Firefox.
export function supportsE2EE(): boolean {
  if (typeof window === 'undefined') return false;

  // Modern: RTCRtpScriptTransform (Chrome 137+, spec-compliant)
  if ('RTCRtpScriptTransform' in window) return true;

  // Legacy: Insertable Streams via createEncodedStreams (older Chrome)
  if (typeof RTCRtpSender !== 'undefined') {
    if ('createEncodedStreams' in RTCRtpSender.prototype) return true;
  }

  return false;
}
