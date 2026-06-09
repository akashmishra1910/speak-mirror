import { motion, AnimatePresence } from "framer-motion";

export interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface ToastNotificationProps {
  toasts: Toast[];
}

export function ToastNotification({ toasts }: ToastNotificationProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`p-4 rounded-2xl border backdrop-blur-md shadow-2xl flex items-start gap-3 pointer-events-auto transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/20 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/20 text-rose-200'
                : 'bg-zinc-900/80 border-white/10 text-white'
            }`}
          >
            <div className="mt-1 flex-shrink-0">
              {toast.type === 'success' ? (
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              ) : toast.type === 'error' ? (
                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse" />
              )}
            </div>
            <div className="flex-1 text-xs font-semibold leading-normal tracking-wide">
              {toast.message}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
