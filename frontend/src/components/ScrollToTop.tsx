import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      // Use smooth behaviour for better UX when navigating between pages
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } catch (e) {
      // Fallback
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
