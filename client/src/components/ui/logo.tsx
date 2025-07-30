import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, showText = true, size = "md" }: LogoProps) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10", 
    lg: "w-12 h-12"
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl"
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Logo Icon - Modern geometric design inspired by job automation */}
      <div className={cn(
        "relative flex items-center justify-center rounded-xl gradient-primary shadow-medium",
        sizes[size]
      )}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-6 h-6 text-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Automation symbol - interconnected nodes and paths */}
          <path
            d="M3 12h3m0 0l3-3m-3 3l3 3M12 3v3m0 0l3-3m-3 3l-3-3M21 12h-3m0 0l-3-3m3 3l-3 3M12 21v-3m0 0l3 3m-3-3l-3 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
          {/* Central node */}
          <circle
            cx="12"
            cy="12"
            r="2"
            fill="currentColor"
          />
          {/* Corner connection dots */}
          <circle cx="6" cy="6" r="1.5" fill="currentColor" opacity="0.6" />
          <circle cx="18" cy="6" r="1.5" fill="currentColor" opacity="0.6" />
          <circle cx="6" cy="18" r="1.5" fill="currentColor" opacity="0.6" />
          <circle cx="18" cy="18" r="1.5" fill="currentColor" opacity="0.6" />
        </svg>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <h1 className={cn(
            "font-bold gradient-text leading-none",
            textSizes[size]
          )}>
            AutoApply
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            AI-Powered Job Applications
          </p>
        </div>
      )}
    </div>
  );
}