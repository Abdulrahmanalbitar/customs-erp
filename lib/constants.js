export const ROLES = {
  ADMIN: 'مدير النظام',
  ACCOUNTANT: 'محاسب',
  BROKER: 'مخلّص جمركي',
  CASHIER: 'كاشير',
};

// which roles can access which section
export const ACCESS = {
  dashboard: ['ADMIN', 'ACCOUNTANT', 'BROKER', 'CASHIER'],
  clients: ['ADMIN', 'ACCOUNTANT', 'BROKER', 'CASHIER'],
  declarations: ['ADMIN', 'BROKER', 'ACCOUNTANT'],
  pos: ['ADMIN', 'CASHIER', 'ACCOUNTANT'],
  invoices: ['ADMIN', 'ACCOUNTANT', 'CASHIER'],
  payments: ['ADMIN', 'ACCOUNTANT', 'CASHIER'],
  expenses: ['ADMIN', 'ACCOUNTANT'],
  employees: ['ADMIN', 'ACCOUNTANT'],
  accounting: ['ADMIN', 'ACCOUNTANT'],
  reports: ['ADMIN', 'ACCOUNTANT'],
  users: ['ADMIN'],
  settings: ['ADMIN'],
  shipments: ['ADMIN', 'BROKER', 'ACCOUNTANT', 'CASHIER'],
  board: ['ADMIN', 'BROKER'],
  quotes: ['ADMIN', 'ACCOUNTANT', 'BROKER'],
  calculator: ['ADMIN', 'ACCOUNTANT', 'BROKER', 'CASHIER'],
  activity: ['ADMIN'],
  ai: ['ADMIN', 'ACCOUNTANT', 'BROKER', 'CASHIER'],
};

export const DECL_TYPES = { IMPORT: 'استيراد', EXPORT: 'تصدير', TRANSIT: 'ترانزيت', TEMP: 'إدخال مؤقت' };
export const TRANSPORT = { SEA: 'بحري', LAND: 'بري', AIR: 'جوي' };

export const DECL_STATUS = {
  RECEIVED: { label: 'مستلمة', color: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300' },
  DOCS_PENDING: { label: 'بانتظار مستندات', color: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  SUBMITTED: { label: 'مقدّمة للجمارك', color: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300' },
  INSPECTION: { label: 'معاينة', color: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300' },
  ASSESSED: { label: 'تم التسعير', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300' },
  DUTIES_PAID: { label: 'تم دفع الرسوم', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300' },
  RELEASED: { label: 'تم الإفراج', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  DELIVERED: { label: 'تم التسليم', color: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' },
  CANCELLED: { label: 'ملغاة', color: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
};
export const OPEN_STATUSES = ['RECEIVED', 'DOCS_PENDING', 'SUBMITTED', 'INSPECTION', 'ASSESSED', 'DUTIES_PAID'];

export const DOC_KINDS = [
  'فاتورة تجارية',
  'بوليصة شحن',
  'شهادة منشأ',
  'قائمة تعبئة',
  'إجازة استيراد',
  'شهادة مطابقة / جودة',
  'شهادة صحية',
  'وكالة / تفويض',
  'بيان جمركي',
  'إيصال دفع الرسوم',
];

export const INVOICE_STATUS = {
  UNPAID: { label: 'غير مدفوعة', color: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  PARTIAL: { label: 'مدفوعة جزئياً', color: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  PAID: { label: 'مدفوعة', color: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' },
  VOID: { label: 'ملغاة', color: 'bg-slate-200 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300' },
};

export const PAY_METHODS = { CASH: 'نقدي', TRANSFER: 'حوالة / تحويل', CHEQUE: 'شيك', CARD: 'بطاقة' };
export const CURRENCIES = { USD: 'دولار', SYP: 'ليرة سورية' };

export const EXPENSE_CATEGORIES = [
  'رسوم جمركية عن العميل',
  'أجور نقل',
  'أجور تحميل وتنزيل',
  'رسوم مرفأ / أرضيات',
  'رسوم معاينة ومخابر',
  'إيجار',
  'كهرباء وماء وإنترنت',
  'قرطاسية وطباعة',
  'ضيافة',
  'محروقات وتنقلات',
  'أخرى',
];

export const ACCOUNTS = {
  CASH: 'الصندوق',
  BANK: 'البنك',
  RECEIVABLE: 'ذمم العملاء',
  REVENUE: 'إيرادات الخدمات',
  DISBURSEMENTS: 'مصاريف مستردة عن العملاء',
  EXPENSE: 'مصاريف تشغيلية',
  SALARIES: 'رواتب وأجور',
};

export const SHIP_MODES = { SEA: 'بحري', AIR: 'جوي', LAND: 'بري' };

export const SHIP_STATUS = {
  BOOKED: { label: 'تم الحجز', color: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300', step: 0 },
  LOADED: { label: 'تم التحميل', color: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300', step: 1 },
  DEPARTED: { label: 'غادرت ميناء الشحن', color: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300', step: 2 },
  IN_TRANSIT: { label: 'في الطريق', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300', step: 3 },
  TRANSSHIPMENT: { label: 'ميناء ترانزيت', color: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300', step: 3 },
  ARRIVED: { label: 'وصلت ميناء الوصول', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300', step: 4 },
  AT_CUSTOMS: { label: 'في الجمارك', color: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', step: 5 },
  CLEARED: { label: 'تم التخليص', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300', step: 6 },
  OUT_FOR_DELIVERY: { label: 'قيد التوصيل', color: 'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300', step: 7 },
  DELIVERED: { label: 'تم التسليم', color: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300', step: 8 },
  DELAYED: { label: 'متأخرة', color: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300', step: 3 },
};
export const SHIP_STEPS = ['تم الحجز', 'تم التحميل', 'غادرت', 'في البحر', 'وصلت', 'الجمارك', 'تم التخليص', 'التوصيل', 'التسليم'];
export const SHIP_ACTIVE = ['BOOKED', 'LOADED', 'DEPARTED', 'IN_TRANSIT', 'TRANSSHIPMENT', 'ARRIVED', 'AT_CUSTOMS', 'DELAYED', 'CLEARED', 'OUT_FOR_DELIVERY'];

export const PRIORITY = {
  LOW: { label: 'منخفضة', color: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300' },
  NORMAL: { label: 'عادية', color: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  HIGH: { label: 'مرتفعة', color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' },
  URGENT: { label: 'عاجلة', color: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
};

export const QUOTE_STATUS = {
  DRAFT: { label: 'مسودة', color: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300' },
  SENT: { label: 'مُرسل', color: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300' },
  ACCEPTED: { label: 'مقبول', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  REJECTED: { label: 'مرفوض', color: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  INVOICED: { label: 'تمت فوترته', color: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300' },
};

// approximate coordinates (lon, lat) used for the route map
export const PORTS = {
  'اللاذقية': [35.78, 35.52], 'طرطوس': [35.87, 34.89], 'بيروت': [35.5, 33.9], 'مرسين': [34.63, 36.8],
  'إسطنبول': [28.97, 41.0], 'بورسعيد': [32.3, 31.26], 'الإسكندرية': [29.9, 31.2], 'العقبة': [35.0, 29.5],
  'جبل علي': [55.03, 25.0], 'جدة': [39.17, 21.5], 'شنغهاي': [121.5, 31.2], 'نينغبو': [121.55, 29.87],
  'شينزن': [114.05, 22.54], 'قوانغتشو': [113.26, 23.13], 'سنغافورة': [103.8, 1.29], 'مومباي': [72.88, 19.07],
  'نافا شيفا': [72.95, 18.95], 'كراتشي': [67.0, 24.86], 'بندر عباس': [56.27, 27.18], 'روتردام': [4.48, 51.92],
  'هامبورغ': [9.99, 53.55], 'أنتويرب': [4.4, 51.22], 'جنوة': [8.93, 44.41], 'برشلونة': [2.17, 41.38],
  'بيرايوس': [23.63, 37.94], 'كونستانتا': [28.65, 44.17], 'نوفوروسيسك': [37.77, 44.72], 'سانتوس': [-46.33, -23.96],
  'نيويورك': [-74.0, 40.7], 'بوسان': [129.04, 35.1], 'طوكيو': [139.77, 35.62], 'مطار دمشق': [36.51, 33.41],
  'معبر نصيب': [36.3, 32.31], 'معبر جديدة يابوس': [36.07, 33.62], 'باب الهوى': [36.67, 36.23], 'دبي': [55.27, 25.2],
};
