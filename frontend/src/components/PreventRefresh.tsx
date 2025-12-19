import { useEffect } from 'react';

type Props = {
  // Allows temporarily disabling the global prevention (useful for forms or specific pages)
  enabled?: boolean;
};

const PreventRefresh: React.FC<Props> = ({ enabled = true }) => {
  useEffect(() => {
    if (!enabled) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      // Prevent refresh/navigation away
      // Standard behavior: set returnValue to a non-empty string
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Prevent F5
      if (e.key === 'F5') {
        e.preventDefault();
        return;
      }

      // Normalize key for cross-browser
      const key = (e.key || '').toLowerCase();
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

      // Prevent Ctrl+R / Cmd+R and Ctrl+Shift+R (hard refresh)
      const metaOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (metaOrCtrl && key === 'r') {
        e.preventDefault();
        return;
      }

      // Also catch Ctrl+Shift+R explicit on non-mac (some browsers use this)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'r') {
        e.preventDefault();
        return;
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('keydown', onKeyDown, { capture: true });

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('keydown', onKeyDown, { capture: true } as any);
    };
  }, [enabled]);

  return null;
};

export default PreventRefresh;
