import { Button } from "./button";
import { Badge } from "./badge";
import { ArrowRight, Sparkles, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  title: string;
  subtitle: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
  };
  features?: string[];
  className?: string;
}

export function HeroSection({
  title,
  subtitle,
  description,
  primaryAction,
  secondaryAction,
  features = [],
  className
}: HeroSectionProps) {
  return (
    <section className={cn("hero-section relative py-20 lg:py-32", className)}>
      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-xl float-animation" />
        <div className="absolute top-40 right-20 w-24 h-24 bg-purple-400/10 rounded-full blur-xl float-animation-delayed" />
        <div className="absolute bottom-32 left-1/3 w-40 h-40 bg-pink-400/10 rounded-full blur-xl float-animation" />
      </div>

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <Badge
            variant="secondary"
            className="mb-6 px-4 py-2 text-sm font-medium bg-accent/50 text-accent-foreground border border-primary/20 shadow-soft"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {subtitle}
          </Badge>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="gradient-text">{title}</span>
          </h1>

          {/* Description */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            {description}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {primaryAction && (
              <Button
                size="lg"
                className="gradient-primary shadow-medium hover:shadow-strong transition-all duration-200 pulse-glow text-lg px-8 py-6"
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
            
            {secondaryAction && (
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 border-2 hover:bg-accent/50 transition-all duration-200"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>

          {/* Features */}
          {features.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {features.map((feature, index) => {
                const icons = [Zap, Target, Sparkles];
                const Icon = icons[index % icons.length];
                
                return (
                  <div
                    key={index}
                    className="flex items-center justify-center gap-2 glass-card rounded-xl p-4 shadow-soft hover:shadow-medium transition-all duration-200"
                  >
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="font-medium text-sm">{feature}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
}