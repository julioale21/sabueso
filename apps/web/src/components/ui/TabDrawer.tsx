/**
 * On small screens, the list of views slides in from the left and covers the whole screen; it
 * closes with ✕ or Escape. From md up it is the side bar, always visible, as tall as the window,
 * on a gray panel so it reads as a bar.
 */
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';

export function TabDrawer({
  id,
  isOpen,
  onClose,
  children,
}: {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onClose();
        }
      }}
      className={cx(
        'fixed inset-0 z-40 overflow-y-auto bg-white p-4 transition-transform motion-reduce:transition-none dark:bg-slate-950',
        'md:static md:z-auto md:h-full md:translate-x-0 md:rounded-lg md:border md:border-slate-200 md:bg-slate-50 md:p-3 md:transition-none md:dark:border-slate-800 md:dark:bg-slate-900',
        isOpen ? 'translate-x-0' : '-translate-x-full max-md:invisible',
      )}
    >
      <div className="mb-3 flex items-center justify-between md:hidden">
        <p className="text-sm font-semibold">Vistas</p>
        <button
          type="button"
          aria-label="Cerrar las vistas"
          onClick={onClose}
          className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}
