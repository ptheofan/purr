import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface ToastContextType {
  showToast: (message: string, severity?: AlertColor) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

interface ToastState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showToast = useCallback((message: string, severity: AlertColor = 'info') => {
    setToast({
      open: true,
      message,
      severity,
    });
  }, []);

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success');
  }, [showToast]);

  const showError = useCallback((message: string) => {
    showToast(message, 'error');
  }, [showToast]);

  const showInfo = useCallback((message: string) => {
    showToast(message, 'info');
  }, [showToast]);

  const showWarning = useCallback((message: string) => {
    showToast(message, 'warning');
  }, [showToast]);

  const handleClose = useCallback((_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setToast(prev => ({ ...prev, open: false }));
  }, []);

  const value: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={toast.open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        autoHideDuration={4000}
        sx={{ 
          width: { xs: '95%', sm: '95%' },
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <Alert
          onClose={handleClose}
          severity={toast.severity}
          variant="filled"
          sx={{
            width: '100%',
            borderRadius: 1,
            '& .MuiAlert-message': {
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.875rem',
              fontWeight: 500,
            },
            '& .MuiAlert-icon': {
              color: 'white',
            },
            '& .MuiIconButton-root': {
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            },
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
