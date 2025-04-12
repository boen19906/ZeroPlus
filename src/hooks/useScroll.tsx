import { useEffect } from 'react';// adjust path if needed

/**
 * A custom React hook that scrolls the window to the top on mount,
 * and scrolls to the bottom when `isSubmitted` becomes true
 * @param questions - Array of quiz questions
 */
export function useScrollToTop(): void {

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);
}

export default useScrollToTop;
