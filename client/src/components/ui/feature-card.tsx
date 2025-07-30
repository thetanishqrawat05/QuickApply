import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "./button";

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  features?: string[];
  action?: {
    label: string;
    onClick?: () => void;
  };
  className?: string;
  highlight?: boolean;
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  features = [],
  action,
  className,
  highlight = false
}: FeatureCardProps) {
  return (
    <div className={cn(
      "glass-card rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 group relative overflow-hidden",
      highlight && "ring-2 ring-primary/20 shadow-medium",
      className
    )}>
      {/* Highlight badge */}
      {highlight && (
        <div className="absolute top-4 right-4 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
          Popular
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {Icon && (
          <div className="flex-shrink-0 w-12 h-12 rounded-xl gradient-accent flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2 gradient-text">
            {title}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Features List */}
      {features.length > 0 && (
        <ul className="space-y-2 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Action Button */}
      {action && (
        <Button
          onClick={action.onClick}
          className="w-full gradient-primary shadow-soft hover:shadow-medium transition-all duration-200"
        >
          {action.label}
        </Button>
      )}

      {/* Hover effect gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}