'use client';

import { Loader2, AlertCircle, CheckCircle2, Inbox } from 'lucide-react';

type StateVariant = 'loading' | 'empty' | 'error' | 'success';

interface StateProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
  variant?: StateVariant;
}

export function StateContainer({ 
  title, 
  message, 
  action, 
  variant = 'empty',
  icon: CustomIcon 
}: StateProps & { icon?: React.ReactNode }) {
  const icons = {
    loading: <Loader2 className="w-10 h-10 animate-spin text-chimera-gold" />,
    empty: <Inbox className="w-10 h-10 text-chimera-text-muted" />,
    error: <AlertCircle className="w-10 h-10 text-red-400" />,
    success: <CheckCircle2 className="w-10 h-10 text-green-400" />,
  };

  const Icon = CustomIcon || icons[variant];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center min-h-[320px]">
      <div className="mb-6">{Icon}</div>
      
      {title && <h3 className="text-2xl font-medium mb-3">{title}</h3>}
      
      {message && <p className="text-chimera-text-muted max-w-sm mb-8">{message}</p>}
      
      {action && <div>{action}</div>}
    </div>
  );
}

export const LoadingState = (props: Omit<StateProps, 'variant'>) => (
  <StateContainer variant="loading" title="Loading..." {...props} />
);

export const EmptyState = (props: Omit<StateProps, 'variant'>) => (
  <StateContainer 
    variant="empty" 
    title="Nothing here yet" 
    message="Check back later or try a different filter."
    {...props} 
  />
);

export const ErrorState = ({ 
  message = "Something went wrong. Please try again.", 
  action,
  ...props 
}: StateProps) => (
  <StateContainer 
    variant="error" 
    title="Error"
    message={message}
    action={action}
    {...props} 
  />
);

export const SuccessState = (props: Omit<StateProps, 'variant'>) => (
  <StateContainer variant="success" title="Success!" {...props} />
);
