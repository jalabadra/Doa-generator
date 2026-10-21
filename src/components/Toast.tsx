import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

export interface ToastState {
  show: boolean;
  message: string;
  isError: boolean;
}

interface ToastProps {
  toast: ToastState;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast.show) return null;

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-300 transform translate-y-0 text-xs font-bold ${
        toast.isError
          ? "bg-rose-600 text-white border border-rose-400/40"
          : "bg-emerald-500 text-slate-950 border border-emerald-400/40 shadow-emerald-500/20"
      }`}
    >
      {toast.isError ? (
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      )}
      <span>{toast.message}</span>
    </div>
  );
};
