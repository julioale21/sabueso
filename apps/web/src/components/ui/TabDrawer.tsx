/**
 * On small screens, the list of views slides in from the left over 80% of the screen, with the
 * page dimmed behind it; it closes with Cerrar, a tap on the dimmed page or Escape. From md up
 * it is the side bar, always visible, as tall as the window, on a gray panel.
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
    <>
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
        />
      )}
      <div
        id={id}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onClose();
          }
        }}
        className={cx(
          'fixed inset-y-0 left-0 z-40 w-4/5 max-w-xs overflow-y-auto bg-white p-4 shadow-xl transition-transform motion-reduce:transition-none dark:bg-slate-950',
          'md:static md:z-auto md:h-full md:w-auto md:max-w-none md:translate-x-0 md:rounded-lg md:border md:border-slate-200 md:bg-slate-50 md:p-3 md:shadow-none md:transition-none md:dark:border-slate-800 md:dark:bg-slate-900',
          isOpen ? 'translate-x-0' : '-translate-x-full max-md:invisible',
        )}
      >
        <div className="mb-4 flex items-center justify-between md:hidden">
          <strong className="text-sm">Vistas</strong>
          <button
            type="button"
            aria-label="Cerrar las vistas"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
