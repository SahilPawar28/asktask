import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = ["Posted", "Accepted", "In Progress", "Completed", "Verified", "Paid"];

export function ProgressTracker({ currentStep = 0 }: { currentStep?: number }) {
  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1 flex-1">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                i <= currentStep
                  ? "gradient-primary text-primary-foreground shadow-lg"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn(
              "text-[9px] text-center leading-tight whitespace-nowrap",
              i <= currentStep ? "text-primary font-medium" : "text-muted-foreground"
            )}>
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              "h-0.5 flex-1 -mt-4 mx-1 rounded-full",
              i < currentStep ? "gradient-primary" : "bg-muted"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
