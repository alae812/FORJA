'use client';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Button } from './Button';

/** Hoja modal inferior (mobile-first) con AnimatePresence */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 glass rounded-t-3xl p-5 pb-8 max-h-[85dvh] overflow-y-auto sm:max-w-lg sm:mx-auto"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="w-10 h-1 rounded-full bg-line mx-auto mb-4" aria-hidden />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">{title}</h3>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
                ✕
              </Button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Diálogo de confirmación */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  danger = false,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p className="text-mist mb-6">{description}</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} className="flex-1">
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
