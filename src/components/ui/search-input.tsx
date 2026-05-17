"use client";

import * as React from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  isLoading?: boolean;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onChange, onClear, isLoading, ...props }, ref) => {
    return (
      <div className={cn("relative flex items-center w-full", className)}>
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={ref}
          value={value}
          onChange={onChange}
          className={cn("pl-9 pr-9 h-10 w-full", className)}
          {...props}
        />
        {isLoading && (
          <div className="absolute right-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && value && String(value).length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              if (onClear) onClear();
              if (!onClear && onChange) {
                const event = {
                  target: { value: "" },
                } as React.ChangeEvent<HTMLInputElement>;
                onChange(event);
              }
            }}
            className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";
