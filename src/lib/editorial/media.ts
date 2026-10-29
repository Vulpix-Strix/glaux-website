/** Pause when motion is reduced, without ever restarting media automatically. */
export function pauseOnReducedMotion(preference: MediaQueryList, pause: () => void) {
  const changed = () => {
    if (preference.matches) pause();
  };
  changed();
  preference.addEventListener('change', changed);
  return () => preference.removeEventListener('change', changed);
}
