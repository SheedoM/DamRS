import { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = {
  title: "الإعدادات | نظام إدارة المشاريع",
};

export default async function PanelSettingsPage() {
  const { profile } = await requireRole(["panel_member"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
        <p className="text-muted-foreground mt-2">
          إدارة إعدادات حسابك.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>تغيير كلمة المرور</CardTitle>
            <CardDescription>
              قم بتحديث كلمة المرور الخاصة بك. بمجرد التغيير، سيتم إخفاء كلمة المرور المؤقتة عن المشرفين.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UpdatePasswordForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>معلومات الحساب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">الاسم</p>
              <p className="text-base">{profile.full_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">البريد الإلكتروني</p>
              <p className="text-base" dir="ltr">{profile.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">القسم</p>
              <p className="text-base">{profile.department || "غير محدد"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
