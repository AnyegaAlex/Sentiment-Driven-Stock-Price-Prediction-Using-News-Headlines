import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef(
  ({ className, indicatorClassName, value, ...props }, ref) => (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-3 w-full overflow-hidden rounded-full bg-white/10",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 rounded-full transition-all duration-700 ease-out",
          indicatorClassName || "bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_14px_rgba(59,130,246,0.55)]"
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
);

Progress.displayName = ProgressPrimitive.Root.displayName;

// ✅ Keep named export
export { Progress };

// ✅ Also add default export for compatibility
export default Progress;