import { Alert } from "@/components/ui/alert";
import { LogoutButton } from "@/components/layout/logout-button";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-xl space-y-4">
        <Alert>
          هذا الحساب يملك دورًا لا يمكن للتطبيق التصريح به. اطلب من المسؤول تصحيح الدور.
        </Alert>
        <LogoutButton className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--brand-navy)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-navy-strong)]">
          العودة لتسجيل الدخول
        </LogoutButton>
      </div>
    </main>
  );
}
