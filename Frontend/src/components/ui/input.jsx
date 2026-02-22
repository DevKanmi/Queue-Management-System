import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Input = forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex w-full min-h-[44px] rounded-xl border border-border bg-surface-elevated px-4 py-3 text-text-primary placeholder:text-text-muted',
        'outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
