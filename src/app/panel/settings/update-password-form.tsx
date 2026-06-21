"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { updatePanelMemberPasswordAction } from "./actions";

export function UpdatePasswordForm() {
  const [state, action, isPending] = useActionState(updatePanelMemberPasswordAction, null);

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && (
        <Alert className="bg-red-50 text-red-900 border-red-200">
          {state.message}
        </Alert>
      )}

      {state?.ok && (
        <Alert className="bg-emerald-50 text-emerald-900 border-emerald-200">
          {state.message}
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">كلمة المرور الجديدة</Label>
        <Input 
          id="password" 
          name="password" 
          type="password" 
          required 
          minLength={6}
          dir="ltr"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
        <Input 
          id="confirmPassword" 
          name="confirmPassword" 
          type="password" 
          required 
          minLength={6}
          dir="ltr"
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "جاري الحفظ..." : "تحديث كلمة المرور"}
      </Button>
    </form>
  );
}
