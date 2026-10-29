import { useEffect } from 'react';

/** Fumadocs portals live under body, outside the page's themed surface. */
export function useSurfaceTheme() {
  useEffect(() => {
    document.body.classList.add('glaux-theme');
    return () => document.body.classList.remove('glaux-theme');
  }, []);
}
