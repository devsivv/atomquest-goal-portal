import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";

type ToastProps = {
  title: string;
  description?: string;
};

export const showToast = {
  success: ({ title, description }: ToastProps) => {
    toast.success(title, {
      description,
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      className: "border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/10 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-100",
    });
  },
  
  error: ({ title, description }: ToastProps) => {
    toast.error(title, {
      description,
      icon: <XCircle className="h-4 w-4 text-red-500" />,
      className: "border-red-500/20 bg-red-50/50 dark:bg-red-500/10 dark:border-red-500/20 text-red-900 dark:text-red-100",
    });
  },

  warning: ({ title, description }: ToastProps) => {
    toast.warning(title, {
      description,
      icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
      className: "border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/10 dark:border-amber-500/20 text-amber-900 dark:text-amber-100",
    });
  },

  info: ({ title, description }: ToastProps) => {
    toast.info(title, {
      description,
      icon: <Info className="h-4 w-4 text-blue-500" />,
      className: "border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/10 dark:border-blue-500/20 text-blue-900 dark:text-blue-100",
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    }
  ) => {
    toast.promise(promise, {
      loading,
      success,
      error,
    });
  },
};
