"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type PasswordToggleProps = {
  password: string | null | undefined;
};

export function PasswordToggle({ password }: PasswordToggleProps) {
  const [isVisible, setIsVisible] = useState(false);

  if (!password) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500 font-medium tracking-wide">تم تعيين كلمة مرور مخصصة</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2 bg-slate-50 border border-slate-200 rounded-md p-2 w-fit">
      <span className="text-sm font-medium text-slate-700 w-32 font-mono">
        {isVisible ? password : "••••••••••••"}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-500 hover:text-slate-900"
        onClick={() => setIsVisible(!isVisible)}
        title={isVisible ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        <span className="sr-only">
          {isVisible ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
        </span>
      </Button>
    </div>
  );
}
