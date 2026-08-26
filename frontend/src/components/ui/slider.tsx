import type { ComponentProps } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-raised">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="relative block size-5 rounded-full bg-fg shadow-[var(--shadow-border)] after:absolute after:inset-[-12px] after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70" />
    </SliderPrimitive.Root>
  );
}
