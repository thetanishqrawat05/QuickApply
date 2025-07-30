import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface ModernCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  children?: ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
  interactive?: boolean;
}

export function ModernCard({
  title,
  description,
  icon: Icon,
  badge,
  children,
  className = '',
  delay = 0,
  onClick,
  interactive = false
}: ModernCardProps) {
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 60,
      scale: 0.8
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        delay,
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  const CardComponent = motion.div;

  return (
    <CardComponent
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={interactive ? { y: -8, transition: { duration: 0.2 } } : undefined}
      className={`glass-card rounded-3xl ${interactive ? 'cursor-pointer interactive-scale' : ''} ${className}`}
      onClick={onClick}
    >
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {Icon && (
                <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
              )}
              <div>
                <CardTitle className="text-xl font-semibold mb-1">{title}</CardTitle>
                {description && (
                  <CardDescription className="text-muted-foreground">
                    {description}
                  </CardDescription>
                )}
              </div>
            </div>
            {badge && (
              <Badge variant="secondary" className="glass-card border-0 text-xs">
                {badge}
              </Badge>
            )}
          </div>
        </CardHeader>
        {children && (
          <CardContent className="pt-0">
            {children}
          </CardContent>
        )}
      </Card>
    </CardComponent>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  features?: string[];
  delay?: number;
  className?: string;
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  features = [],
  delay = 0,
  className = ''
}: FeatureCardProps) {
  return (
    <ModernCard
      title={title}
      description={description}
      icon={Icon}
      delay={delay}
      interactive={true}
      className={className}
    >
      {features.length > 0 && (
        <div className="space-y-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.1 + index * 0.05 }}
              className="flex items-center space-x-2 text-sm text-muted-foreground"
            >
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span>{feature}</span>
            </motion.div>
          ))}
        </div>
      )}
    </ModernCard>
  );
}