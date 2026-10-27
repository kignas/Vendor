import { cn } from '@/lib/cn';

/** shadcn/ui Input, retuned to the Eatswada tokens (44px, 10px radius). */
export function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-faint',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
