// @flow
import { createContext, useContext } from 'react';

export const SnackbarSeverity = Object.freeze({
    CRITICAL: 'critical',
    WARNING: 'warning',
    SUCCESS: 'success',
});

export type Snackbar = {
    key: string;
    message: string;
    severity?: "success" | "critical" | "warning";
    duration?: number;
};

export type ISnackbarContext = {
    showSnackbar: (snackbar: Snackbar) => void;
}

export const SnackbarContext = createContext<ISnackbarContext | null>(null);

export const useSnackbar = (): ISnackbarContext => {
    const context = useContext(SnackbarContext);
    if (!context) {
        throw new Error('useSnackbar must be used within a SnackbarProvider');
    }
    return context;
};
