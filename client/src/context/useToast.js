import { useContext } from 'react';
import { ToastContext } from './toastContext.js';

/**
 * Show a short message in the corner of the screen.
 *
 * @returns {{ notify: (message: string, type?: 'success' | 'error') => void }}
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider.');
  }
  return context;
}
