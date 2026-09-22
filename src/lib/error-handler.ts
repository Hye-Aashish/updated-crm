import { getErrorMessage } from './api-client';

interface ToastFn {
    (props: { title?: string; description: string; variant?: 'default' | 'destructive' }): void;
}

/**
 * Standardized API Error Toast Handler
 * Displays clean titles and descriptions for Permission Denied, Validation, Network, and Server Errors.
 */
export function handleApiError(
    error: any,
    toast?: ToastFn,
    defaultTitle: string = 'Operation Failed'
): string {
    const message = getErrorMessage(error);
    const status = error?.status || error?.response?.status;
    const isPermissionError = status === 403 || error?.isPermissionError || message.toLowerCase().includes('permission');

    let title = defaultTitle;
    if (isPermissionError) {
        title = 'Permission Denied';
    } else if (status === 401) {
        title = 'Authentication Error';
    } else if (status === 404) {
        title = 'Not Found';
    } else if (status === 400) {
        title = 'Validation Error';
    } else if (error?.code === 'ERR_NETWORK' || message.toLowerCase().includes('network')) {
        title = 'Network Error';
    }

    if (toast) {
        toast({
            title,
            description: message,
            variant: 'destructive',
        });
    }

    return message;
}
