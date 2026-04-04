import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-xl w-full space-y-6 text-center">
                        <div className="flex justify-center">
                            <div className="p-4 rounded-full bg-destructive/10 text-destructive">
                                <AlertTriangle className="h-12 w-12" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Something went wrong
                            </h1>
                            <p className="text-muted-foreground">
                                An unexpected error occurred. Our team has been notified.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="bg-muted p-4 rounded-lg text-left overflow-auto max-h-[300px] text-xs font-mono border">
                                <p className="font-bold text-destructive mb-2">{this.state.error.toString()}</p>
                                <p className="text-muted-foreground whitespace-pre-wrap">
                                    {this.state.errorInfo?.componentStack}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-4 justify-center">
                            <Button onClick={() => window.location.reload()}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Reload Page
                            </Button>
                             <Button variant="outline" onClick={() => {
                                 if (window.location.protocol === 'file:') {
                                     window.location.hash = '#/';
                                 } else {
                                     window.location.href = '/';
                                 }
                             }}>
                                 <Home className="mr-2 h-4 w-4" />
                                 Go Home
                             </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
