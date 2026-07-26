import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-black",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-white text-black hover:bg-gray-200",
        secondary:
          "border-transparent bg-gray-800 text-white hover:bg-gray-700",
        destructive:
          "border-transparent bg-red-400 text-white hover:bg-red-400/80",
        outline: 
          "border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (
    <div 
      className={cn(badgeVariants({ variant }), className)} 
      {...props} 
    />
  )
}

export { Badge, badgeVariants }