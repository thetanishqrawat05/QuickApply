import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className
}: StatsCardProps) {
  return (
    <div className={cn(
      "glass-card rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-200 group",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold gradient-text">
              {value}
            </h3>
            {trend && (
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                trend.isPositive 
                  ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20"
                  : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20"
              )}>
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
        
        {Icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg gradient-accent flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}