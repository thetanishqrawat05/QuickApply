import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { LucideIcon, Upload, Check, AlertCircle } from 'lucide-react';
import { forwardRef, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

interface ModernFormFieldProps {
  label: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
  icon?: LucideIcon;
  delay?: number;
}

export function ModernFormField({
  label,
  description,
  required = false,
  children,
  icon: Icon,
  delay = 0
}: ModernFormFieldProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="space-y-2"
    >
      <div className="flex items-center space-x-2">
        {Icon && <Icon className="w-4 h-4 text-primary" />}
        <Label className="text-sm font-medium flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {children}
    </motion.div>
  );
}

interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  success?: boolean;
}

export const ModernInput = forwardRef<HTMLInputElement, ModernInputProps>(
  ({ className = '', error, success, ...props }, ref) => {
    return (
      <div className="relative">
        <Input
          ref={ref}
          className={`modern-input rounded-xl ${error ? 'border-red-300 focus:border-red-500' : success ? 'border-green-300 focus:border-green-500' : ''} ${className}`}
          {...props}
        />
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-3 top-3"
          >
            <AlertCircle className="w-4 h-4 text-red-500" />
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-3 top-3"
          >
            <Check className="w-4 h-4 text-green-500" />
          </motion.div>
        )}
      </div>
    );
  }
);

interface ModernTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const ModernTextarea = forwardRef<HTMLTextAreaElement, ModernTextareaProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        className={`modern-input rounded-xl resize-none ${error ? 'border-red-300 focus:border-red-500' : ''} ${className}`}
        {...props}
      />
    );
  }
);

interface ModernSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  children: ReactNode;
  error?: string;
}

export function ModernSelect({ value, onValueChange, placeholder, children, error }: ModernSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`modern-input rounded-xl ${error ? 'border-red-300 focus:border-red-500' : ''}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="glass-card border-white/30 rounded-xl">
        {children}
      </SelectContent>
    </Select>
  );
}

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  currentFile?: File | null;
  label: string;
  description?: string;
  error?: string;
}

export function ModernFileUpload({
  onFileSelect,
  accept = '.pdf,.doc,.docx',
  currentFile,
  label,
  description,
  error
}: FileUploadProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <Label className="text-sm font-medium">{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      
      <div className="relative">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className={`glass-card border-2 border-dashed border-white/30 hover:border-white/50 rounded-xl p-6 text-center transition-all duration-300 ${currentFile ? 'border-green-300 bg-green-50/50' : ''} ${error ? 'border-red-300 bg-red-50/50' : ''}`}>
          <div className="flex flex-col items-center space-y-2">
            {currentFile ? (
              <Check className="w-8 h-8 text-green-500" />
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground" />
            )}
            <div className="text-sm">
              {currentFile ? (
                <div className="space-y-1">
                  <p className="font-medium text-green-700">{currentFile.name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                  </Badge>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Click to upload or drag and drop</p>
                  <p className="text-muted-foreground">PDF, DOC, DOCX up to 10MB</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface ModernCheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function ModernCheckbox({ checked, onCheckedChange, label, description }: ModernCheckboxProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start space-x-3"
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-1 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      <div className="space-y-1">
        <Label className="text-sm font-medium cursor-pointer">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </motion.div>
  );
}

interface ModernButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: LucideIcon;
}

export function ModernButton({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon: Icon
}: ModernButtonProps) {
  const baseClasses = 'rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2';
  
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'glass-card border-white/30 hover:border-white/50',
    outline: 'border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5'
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <motion.div whileTap={{ scale: 0.98 }} className="inline-block">
      <Button
        onClick={onClick}
        type={type}
        disabled={disabled || loading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          Icon && <Icon className="w-4 h-4" />
        )}
        <span>{children}</span>
      </Button>
    </motion.div>
  );
}