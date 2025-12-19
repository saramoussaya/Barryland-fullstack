import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';

type ToastType = 'info' | 'success' | 'error' | 'warning';
interface Toast { id: string; message: string; type?: ToastType }

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Keep timers to allow immediate cancellation / faster dismissal
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    return () => {
      // cleanup timers on unmount
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(x => x.id !== id));
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 2500) => {
    const id = Date.now().toString();
    const t: Toast = { id, message, type };
    setToasts(prev => [t, ...prev]);
    // schedule removal
    const timer = window.setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== id));
      timersRef.current.delete(id);
    }, duration);
    timersRef.current.set(id, timer);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Positioned just below the sticky header and centered */}
      <div aria-live="polite" className="fixed left-0 right-0 top-16 z-50 flex justify-center pointer-events-none">
        <div className="flex flex-col gap-2 w-full max-w-xl px-4">
          {toasts.map(t => (
            <div
              key={t.id}
              onClick={() => removeToast(t.id)}
              role="status"
              className={`mx-auto w-full pointer-events-auto px-4 py-2 rounded shadow-lg text-white cursor-pointer transform transition-all duration-150 ease-out hover:scale-105 ${
                t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-red-600' : t.type === 'warning' ? 'bg-yellow-600 text-black' : 'bg-gray-800'
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

export default ToastContext;
