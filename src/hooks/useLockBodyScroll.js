import { useEffect } from 'react';

export function useLockBodyScroll(isLocked = true) {
  useEffect(() => {
    if (!isLocked) return;
    
    // Get original body overflow
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Prevent scrolling on mount
    document.body.style.overflow = 'hidden';
    
    // Re-enable scrolling when component unmounts or lock state changes
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isLocked]);
}
