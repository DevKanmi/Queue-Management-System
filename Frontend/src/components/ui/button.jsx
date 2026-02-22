import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50 min-h-[44px] [&_svg]:size-4',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary-hover hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]',
        secondary:
          'bg-surface-elevated text-text-primary border border-border hover:bg-surface hover:border-border-strong',
        outline:
          'border border-border bg-transparent text-text-primary hover:bg-surface-elevated',
        ghost: 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
        destructive:
          'bg-danger/15 text-danger border border-danger/20 hover:bg-danger/25',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-6 py-2',
        sm: 'h-9 rounded-lg px-4 text-sm',
        lg: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = forwardRef(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});
Button.displayName = 'Button';

export { Button, buttonVariants };
