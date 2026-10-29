import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

/**
 * shadcn/ui Button (Radix Slot), retuned to the Eatswada tokens: 10px radius,
 * 44px minimum tap target, monochrome primary.
 */
const buttonVariants = cva(
  'press inline-flex min-h-tap items-center justify-center gap-2 whitespace-nowrap rounded-btn px-4 text-sm font-semibold transition-colors active:brightness-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-inverse text-inverse-ink hover:bg-inverse/90',
        secondary: 'border border-border bg-card text-ink hover:bg-border-soft',
        ghost: 'text-ink hover:bg-border-soft',
        danger: 'bg-danger text-white hover:bg-danger/90',
        brand: 'bg-brand text-white hover:bg-brand/90',
      },
      size: {
        default: 'h-11',
        sm: 'h-9 min-h-9 px-3 text-xs',
        lg: 'h-12',
        icon: 'h-11 w-11 px-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
