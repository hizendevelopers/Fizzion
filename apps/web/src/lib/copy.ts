import type { AppLocale } from "./preferences";

type CopyTree = {
  appName: string;
  partnership: string;
  languageLabel: string;
  timezoneLabel: string;
  searchPlaceholder: string;
  dataFreshness: string;
  notifications: string;
  profile: string;
  signOut: string;
  filters: {
    dateRange: string;
    market: string;
    brand: string;
    campaign: string;
  };
  nav: Record<string, string>;
  states: {
    noData: string;
    noDataDescription: string;
    externalDependency: string;
    sandboxReady: string;
    activationRequired: string;
  };
  auth: {
    welcome: string;
    email: string;
    password: string;
    signIn: string;
    forgotPassword: string;
    mfa: string;
    code: string;
    resetIntro: string;
  };
};

const en: CopyTree = {
  appName: "FizZion",
  partnership: "Media Intelligence Reimagined",
  languageLabel: "Language",
  timezoneLabel: "Time zone",
  searchPlaceholder: "Search brands, creatives, channels, URLs, captions, and notes",
  dataFreshness: "Data freshness",
  notifications: "Notifications",
  profile: "Profile",
  signOut: "Sign out",
  filters: {
    dateRange: "Last 7 days",
    market: "Iraq",
    brand: "All brands",
    campaign: "All campaigns",
  },
  nav: {
    overview: "Overview",
    tv: "TV",
    tvChannels: "TV Channels",
    tvOccurrences: "TV Occurrences",
    tvReviewQueue: "TV Review Queue",
    social: "Social",
    socialAccounts: "Social Accounts",
    socialComparison: "Social Comparison",
    web: "Web",
    ooh: "OOH",
    metaLibrary: "Meta Library",
    oohMap: "OOH Map",
    oohLocations: "OOH Locations",
    oohAddLocation: "Add OOH Location",
    creatives: "Creative Library",
    campaigns: "Campaigns",
    brands: "Competitors",
    brandsList: "Brands List",
    products: "Products",
    reports: "Reports",
    alerts: "Alerts",
    dataQuality: "Data Quality",
    admin: "Administration",
    adminUsers: "Users",
    adminRoles: "Roles",
    adminIntegrations: "Integrations",
    adminSources: "Source Configuration",
    adminRetention: "Retention Settings",
    adminAuditLogs: "Audit Logs",
    adminSystemHealth: "System Health",
  },
  states: {
    noData: "No verified data yet",
    noDataDescription:
      "This area is ready for production data once the required sources and credentials are activated.",
    externalDependency: "External dependency",
    sandboxReady: "Sandbox-ready connector",
    activationRequired: "Activation required",
  },
  auth: {
    welcome: "Secure access to Iraqi media intelligence",
    email: "Work email",
    password: "Password",
    signIn: "Sign in",
    forgotPassword: "Forgot password?",
    mfa: "Multi-factor verification",
    code: "Verification code",
    resetIntro: "Enter your work email and we will send a reset link if the account exists.",
  },
};

const ar: CopyTree = {
  appName: "فِزيون",
  partnership: "Media Intelligence Reimagined",
  languageLabel: "اللغة",
  timezoneLabel: "المنطقة الزمنية",
  searchPlaceholder: "ابحث في العلامات والإعلانات والقنوات والروابط والتعليقات والملاحظات",
  dataFreshness: "تحديث البيانات",
  notifications: "الإشعارات",
  profile: "الملف الشخصي",
  signOut: "تسجيل الخروج",
  filters: {
    dateRange: "آخر 7 أيام",
    market: "العراق",
    brand: "جميع العلامات",
    campaign: "جميع الحملات",
  },
  nav: {
    overview: "Overview",
    tv: "TV",
    tvChannels: "قنوات التلفزيون",
    tvOccurrences: "مرات الظهور التلفزيوني",
    tvReviewQueue: "طابور مراجعة التلفزيون",
    social: "Social",
    socialAccounts: "الحسابات الاجتماعية",
    socialComparison: "مقارنة اجتماعية",
    web: "Web",
    ooh: "ذكاء الإعلانات الخارجية",
    metaLibrary: "مكتبة ميتا",
    oohMap: "خريطة الإعلانات الخارجية",
    oohLocations: "مواقع الإعلانات الخارجية",
    oohAddLocation: "إضافة موقع خارجي",
    creatives: "مكتبة المواد الإبداعية",
    campaigns: "الحملات",
    brands: "العلامات والمنافسون",
    brandsList: "قائمة العلامات",
    products: "المنتجات",
    reports: "التقارير",
    alerts: "التنبيهات",
    dataQuality: "جودة البيانات",
    admin: "الإدارة",
    adminUsers: "المستخدمون",
    adminRoles: "الأدوار",
    adminIntegrations: "التكاملات",
    adminSources: "تهيئة المصادر",
    adminRetention: "إعدادات الاحتفاظ",
    adminAuditLogs: "سجلات التدقيق",
    adminSystemHealth: "صحة النظام",
  },
  states: {
    noData: "لا توجد بيانات موثقة بعد",
    noDataDescription:
      "هذه المنطقة جاهزة لبيانات الإنتاج فور تفعيل المصادر والاعتمادات المطلوبة.",
    externalDependency: "اعتماد خارجي",
    sandboxReady: "موصل جاهز للبيئة التجريبية",
    activationRequired: "التفعيل مطلوب",
  },
  auth: {
    welcome: "وصول آمن إلى منصة ذكاء الإعلام العراقي",
    email: "البريد الإلكتروني للعمل",
    password: "كلمة المرور",
    signIn: "تسجيل الدخول",
    forgotPassword: "هل نسيت كلمة المرور؟",
    mfa: "التحقق متعدد العوامل",
    code: "رمز التحقق",
    resetIntro: "أدخل بريد العمل وسنرسل رابط إعادة التعيين إذا كان الحساب موجودًا.",
  },
};

export function getCopy(locale: AppLocale) {
  return locale === "ar" ? ar : en;
}
