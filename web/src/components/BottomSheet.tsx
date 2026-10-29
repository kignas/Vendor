import { Drawer } from 'vaul';
import { cn } from '@/lib/cn';

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Bottom sheet (vaul). AGENTS.md: bottom sheets instead of modals. The handle
 * bar and drag-to-dismiss come from vaul; the body is scrollable.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim/60" />
        <Drawer.Content
          className={cn(
            'app-column fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-card bg-card outline-none',
            className,
          )}
        >
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-pill bg-border" />
          <Drawer.Title
            className={cn(
              'px-5 pb-2 pt-4 text-base font-bold text-ink',
              !title && 'sr-only',
            )}
          >
            {title ?? 'Options'}
          </Drawer.Title>
          {/* Radix requires a Description (or an explicit opt-out) on the
             content; keep one present so assistive tech always gets context. */}
          <Drawer.Description
            className={cn('px-5 text-xs text-ink-soft', description ? 'pb-1' : 'sr-only')}
          >
            {description ?? 'Bottom sheet content'}
          </Drawer.Description>
          <div className="safe-bottom overflow-y-auto px-5 pb-6 pt-2">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
