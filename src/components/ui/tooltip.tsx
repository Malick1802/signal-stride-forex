import * as React from "react"

// Temporarily disable TooltipPrimitive to prevent React null errors
console.log('tooltip.tsx: Loading, React object:', React);

// Create stub components that don't use React hooks
const TooltipProvider = ({ children, delayDuration, ...props }: { 
  children: React.ReactNode; 
  delayDuration?: number;
  [key: string]: any;
}) => {
  console.log('TooltipProvider: Rendering stub version, delayDuration:', delayDuration);
  return <div data-tooltip-provider {...props}>{children}</div>;
};

const Tooltip = ({ children }: { children: React.ReactNode }) => {
  console.log('Tooltip: Rendering stub version');
  return <div data-tooltip-root>{children}</div>;
};

const TooltipTrigger = ({ children, asChild, ...props }: any) => {
  console.log('TooltipTrigger: Rendering stub version');
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, props);
  }
  return <div data-tooltip-trigger {...props}>{children}</div>;
};

const TooltipContent = React.forwardRef<HTMLDivElement, any>(
  ({ className, sideOffset = 4, children, ...props }, ref) => {
    console.log('TooltipContent: Rendering stub version');
    return (
      <div
        ref={ref}
        data-tooltip-content
        className={className}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
