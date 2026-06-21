// Onboarding tour content (Arabic, RTL). Each tour is keyed by route and lists
// ordered steps anchored to `[data-tour="..."]` elements. The controller filters
// out steps whose anchor is missing on the current render, so conditional
// sections (e.g. a closed-grading alert) degrade gracefully.

export type TourStep = {
  element: string;
  title: string;
  description: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};

const navStep: TourStep = {
  element: '[data-tour="nav"]',
  title: "التنقل",
  description: "استخدم هذه القائمة للتنقل بين أقسام النظام في أي وقت.",
  side: "left",
  align: "start",
};

export const tours = {
  adminDashboard: [
    navStep,
    {
      element: '[data-tour="admin-metrics"]',
      title: "ملخص المشاريع",
      description: "نظرة سريعة على حالة كل المشاريع. اضغط أي بطاقة للانتقال إلى القائمة المُفلترة.",
      side: "bottom",
    },
    {
      element: '[data-tour="admin-grading"]',
      title: "باب التقييم",
      description: "افتح أو أغلق باب التقييم لأعضاء اللجنة، وصدّر كشف الدرجات من هنا.",
      side: "bottom",
    },
    {
      element: '[data-tour="admin-submission"]',
      title: "نافذة التسليم",
      description: "حدّد فترة فتح التسليم حتى يتمكن الطلاب من رفع مشاريعهم.",
      side: "top",
    },
    {
      element: '[data-tour="admin-settings"]',
      title: "إعدادات المشاريع",
      description: "اضبط الحد الأقصى لعدد أعضاء الفريق في كل مشروع.",
      side: "top",
    },
  ],
  adminProjects: [
    navStep,
    {
      element: '[data-tour="admin-projects-create"]',
      title: "إنشاء مشروع",
      description: "أنشئ مشروعًا جديدًا؛ يُنشأ حساب قائد الفريق تلقائيًا.",
      side: "bottom",
    },
    {
      element: '[data-tour="admin-projects-table"]',
      title: "قائمة المشاريع",
      description:
        "ابحث وفلتر المشاريع حسب الحالة والتقييم والإسناد، وأسند أعضاء لجنة بشكل فردي أو جماعي.",
      side: "top",
    },
  ],
  adminProjectDetail: [
    {
      element: '[data-tour="project-info"]',
      title: "بيانات المشروع",
      description: "العنوان والملخص والمشرف وروابط المشروع.",
      side: "bottom",
    },
    {
      element: '[data-tour="project-files"]',
      title: "الملفات المرفوعة",
      description: "افتح ملفات الطلاب: التوثيق والكود والعرض التقديمي.",
      side: "top",
    },
    {
      element: '[data-tour="project-assignments"]',
      title: "أعضاء اللجنة",
      description: "أسند أعضاء اللجنة لهذا المشروع أو ألغِ إسنادهم.",
      side: "top",
    },
    {
      element: '[data-tour="project-grades"]',
      title: "درجات الطلاب",
      description: "أدخل درجة الفصل الأول والإشراف لكل طالب؛ تُجمع درجات المناقشة تلقائيًا.",
      side: "top",
    },
  ],
  adminPanelMembers: [
    navStep,
    {
      element: '[data-tour="panel-members-create"]',
      title: "إضافة عضو لجنة",
      description: "أنشئ حساب عضو لجنة جديد بكلمة مرور مؤقتة.",
      side: "bottom",
    },
    {
      element: '[data-tour="panel-members-list"]',
      title: "أعضاء اللجنة",
      description: "قائمة الأعضاء الحاليين وكلمات المرور المؤقتة.",
      side: "top",
    },
  ],
  adminStudents: [
    navStep,
    {
      element: '[data-tour="students-main"]',
      title: "الطلاب",
      description: "أنشئ حسابات الطلاب وأدر الأرقام الجامعية المعتمدة للتسجيل الذاتي.",
      side: "top",
    },
  ],
  panelDashboard: [
    navStep,
    {
      element: '[data-tour="panel-assigned"]',
      title: "المشاريع المسندة",
      description: "هذه هي المشاريع المسندة إليك للتقييم. اضغط مشروعًا لفتحه.",
      side: "top",
    },
    {
      element: '[data-tour="panel-filters"]',
      title: "تصفية المشاريع",
      description: "صفِّ المشاريع حسب حالة التقييم: الكل، بانتظار التقييم، أو تم التقييم.",
      side: "bottom",
    },
  ],
  panelProjectDetail: [
    {
      element: '[data-tour="panel-project-info"]',
      title: "بيانات المشروع",
      description: "تفاصيل المشروع المُسند إليك.",
      side: "bottom",
    },
    {
      element: '[data-tour="panel-files"]',
      title: "الملفات",
      description: "افتح ملفات المشروع لمراجعتها قبل التقييم.",
      side: "top",
    },
    {
      element: '[data-tour="panel-discussion"]',
      title: "تقييم المناقشة",
      description: "أدخل درجات المناقشة لكل طالب (يُتاح عند فتح باب التقييم).",
      side: "top",
    },
  ],
  panelSettings: [
    {
      element: '[data-tour="panel-password"]',
      title: "كلمة المرور",
      description: "غيّر كلمة المرور المؤقتة إلى كلمة خاصة بك.",
      side: "bottom",
    },
    {
      element: '[data-tour="panel-account"]',
      title: "معلومات الحساب",
      description: "بياناتك الأساسية في النظام.",
      side: "bottom",
    },
  ],
  studentProject: [
    navStep,
    {
      element: '[data-tour="student-project"]',
      title: "مشروعي",
      description: "من هنا تنشئ مشروعك، تضيف أعضاء الفريق، ترفع الملفات المطلوبة، ثم تُسلّم.",
      side: "top",
    },
  ],
} satisfies Record<string, TourStep[]>;

export type TourKey = keyof typeof tours;

export function resolveTourKey(pathname: string): TourKey | null {
  const p = (pathname || "/").replace(/\/+$/, "") || "/";

  if (p === "/admin") return "adminDashboard";
  if (p === "/admin/projects") return "adminProjects";
  if (p !== "/admin/projects/new" && /^\/admin\/projects\/[^/]+$/.test(p)) return "adminProjectDetail";
  if (p === "/admin/panel-members") return "adminPanelMembers";
  if (p === "/admin/students") return "adminStudents";
  if (p === "/panel") return "panelDashboard";
  if (/^\/panel\/projects\/[^/]+$/.test(p)) return "panelProjectDetail";
  if (p === "/panel/settings") return "panelSettings";
  if (p === "/student/project") return "studentProject";

  return null;
}
