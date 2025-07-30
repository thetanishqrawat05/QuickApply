import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SeamlessFeedbackProps {
  type: 'loading' | 'success' | 'processing';
  message: string;
  details?: string;
  progress?: number;
}

export function SeamlessFeedback({ type, message, details, progress }: SeamlessFeedbackProps) {
  const icons = {
    loading: Clock,
    success: CheckCircle,
    processing: Sparkles
  };

  const colors = {
    loading: 'text-blue-500',
    success: 'text-green-500',
    processing: 'text-purple-500'
  };

  const Icon = icons[type];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        className="glass-card rounded-2xl p-6 max-w-md mx-auto"
      >
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-full bg-gradient-to-br from-${type === 'loading' ? 'blue' : type === 'success' ? 'green' : 'purple'}-50 to-${type === 'loading' ? 'blue' : type === 'success' ? 'green' : 'purple'}-100`}>
            <Icon className={`w-6 h-6 ${colors[type]} ${type === 'loading' || type === 'processing' ? 'animate-pulse' : ''}`} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{message}</p>
            {details && (
              <p className="text-xs text-muted-foreground mt-1">{details}</p>
            )}
          </div>
          {type !== 'success' && (
            <Badge variant="secondary" className="text-xs">
              {type === 'loading' ? 'Processing...' : 'In Progress'}
            </Badge>
          )}
        </div>
        
        {progress !== undefined && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress / 100 }}
            className="mt-4 h-2 bg-gradient-to-r from-primary/20 to-primary/40 rounded-full overflow-hidden"
          >
            <div className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full" />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

interface StatusIndicatorProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusIndicator({ status, size = 'md' }: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  const statusConfig = {
    idle: { color: 'bg-gray-300', animation: '' },
    loading: { color: 'bg-blue-500', animation: 'animate-pulse' },
    success: { color: 'bg-green-500', animation: 'animate-bounce' },
    error: { color: 'bg-orange-400', animation: 'animate-pulse' } // Changed from red to orange for softer appearance
  };

  const config = statusConfig[status];

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`${sizeClasses[size]} ${config.color} rounded-full ${config.animation}`}
    />
  );
}

interface ProgressStepsProps {
  steps: Array<{
    label: string;
    status: 'pending' | 'active' | 'completed';
  }>;
}

export function ProgressSteps({ steps }: ProgressStepsProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="space-y-4">
        {steps.map((step, index) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center space-x-3"
          >
            <div className="relative">
              <StatusIndicator status={
                step.status === 'completed' ? 'success' : 
                step.status === 'active' ? 'loading' : 'idle'
              } />
              {index < steps.length - 1 && (
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-border" />
              )}
            </div>
            <span className={`text-sm ${step.status === 'completed' ? 'text-green-600 font-medium' : step.status === 'active' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              {step.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}