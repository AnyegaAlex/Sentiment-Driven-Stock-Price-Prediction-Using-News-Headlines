import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-gray-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-gray-800 data-[state=on]:text-white [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 gap-2 min-h-[44px]",
  {
    variants: {
      variant: {
        default: "bg-transparent text-gray-400 hover:bg-gray-800 hover:text-white data-[state=on]:bg-white data-[state=on]:text-black",
        outline: "border border-gray-800 bg-transparent text-gray-400 hover:bg-gray-800 hover:text-white data-[state=on]:bg-white data-[state=on]:text-black data-[state=on]:border-white",
      },
      size: {
        default: "px-3 min-w-[44px]",
        sm: "px-2.5 min-w-[40px] min-h-[40px] text-xs",
        lg: "px-5 min-w-[48px] min-h-[48px] text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Toggle = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }