import * as React from "react"

// Simplified tooltip components to avoid React hook corruption
const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
const Tooltip = ({ children }: { children: React.ReactNode }) => <>{children}</>
const TooltipTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>
const TooltipContent = ({ children }: { children: React.ReactNode }) => <>{children}</>

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
