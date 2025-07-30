import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animated?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12', 
  lg: 'w-16 h-16',
  xl: 'w-24 h-24'
};

export function Logo({ size = 'md', className = '', animated = false }: LogoProps) {
  const logoVariants = {
    initial: { scale: 0, rotate: -180 },
    animate: { 
      scale: 1, 
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20
      }
    }
  };

  const LogoComponent = animated ? motion.div : 'div';

  return (
    <LogoComponent
      variants={animated ? logoVariants : undefined}
      initial={animated ? "initial" : undefined}
      animate={animated ? "animate" : undefined}
      className={`${sizeClasses[size]} ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Outer circle with gradient */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(262, 83%, 58%)" />
            <stop offset="50%" stopColor="hsl(285, 85%, 65%)" />
            <stop offset="100%" stopColor="hsl(310, 87%, 70%)" />
          </linearGradient>
          <linearGradient id="innerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.6)" />
          </linearGradient>
        </defs>
        
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="url(#logoGradient)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="2"
        />
        
        {/* Inner elements representing automation */}
        {/* Central gear/cog */}
        <circle
          cx="50"
          cy="50"
          r="12"
          fill="url(#innerGradient)"
          opacity="0.9"
        />
        
        {/* Automation arrows/flow */}
        <path
          d="M30 35 L40 25 L35 20 M40 25 L45 30"
          stroke="url(#innerGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        
        <path
          d="M70 65 L60 75 L65 80 M60 75 L55 70"
          stroke="url(#innerGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        
        {/* AI/Brain representation */}
        <circle cx="35" cy="35" r="4" fill="url(#innerGradient)" opacity="0.7" />
        <circle cx="65" cy="65" r="4" fill="url(#innerGradient)" opacity="0.7" />
        <circle cx="65" cy="35" r="3" fill="url(#innerGradient)" opacity="0.6" />
        <circle cx="35" cy="65" r="3" fill="url(#innerGradient)" opacity="0.6" />
        
        {/* Connection lines */}
        <path
          d="M35 35 Q50 25 65 35"
          stroke="url(#innerGradient)"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        />
        <path
          d="M35 65 Q50 75 65 65"
          stroke="url(#innerGradient)"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        />
        
        {/* Central sparkle/star */}
        <path
          d="M50 45 L52 50 L50 55 L48 50 Z M45 50 L50 52 L55 50 L50 48 Z"
          fill="url(#innerGradient)"
          opacity="0.9"
        />
      </svg>
    </LogoComponent>
  );
}