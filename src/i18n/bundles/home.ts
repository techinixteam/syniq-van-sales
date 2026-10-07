/** Home — the tiles, and every reason the app cannot start selling yet (one person to ask each). */

const en = {
  home: {
    sell: 'Sell',
    stock: 'Stock',
    newInvoice: 'New invoice',
    newInvoiceHint: 'Sell from your van — a tax invoice',
    invoices: 'Invoices',
    invoicesHint: 'Your van’s invoices — view or share the PDF',
    newQuotation: 'New quotation',
    newQuotationHint: 'Price an offer for a customer',
    quotations: 'Quotations',
    quotationsHint: 'The quotations you raised',
    vanStock: 'My van',
    vanStockHint: 'What is on your van now',
    dcStock: 'DC stock',
    dcStockHint: 'What the distribution centre holds',
    vanInactive: 'Inactive',

    gate: {
      loading: 'Getting your van ready…',
      noAccess: 'Not set up for van sales',
      noAccessBody: 'Your login does not have the Van Sales Representative role. Ask whoever manages system access.',
      notB2b: 'Not a B2B branch',
      notB2bBody: 'Your home branch does not sell B2B, so van sales are closed to you. Ask HR to check your branch.',
      noCompany: 'No company found',
      noCompanyBody: 'Your van-sales access is not tied to one company. Ask whoever manages system access to assign it at company level.',
      noSalesperson: 'Not linked to a salesperson',
      noSalespersonBody: 'Your login is not linked to an active salesperson. Ask your sales manager to link it.',
      noVan: 'No van assigned',
      noVanBody: 'No van is assigned to you yet. Ask your sales manager to assign one.',
      error: 'Could not load your van',
    },
  },
};

const ar: typeof en = {
  home: {
    sell: 'البيع',
    stock: 'المخزون',
    newInvoice: 'فاتورة جديدة',
    newInvoiceHint: 'بيع من سيارتك — فاتورة ضريبية',
    invoices: 'الفواتير',
    invoicesHint: 'فواتير سيارتك — عرض أو مشاركة ملف PDF',
    newQuotation: 'عرض سعر جديد',
    newQuotationHint: 'تسعير عرض لعميل',
    quotations: 'عروض الأسعار',
    quotationsHint: 'عروض الأسعار التي أنشأتها',
    vanStock: 'سيارتي',
    vanStockHint: 'ما يوجد في سيارتك الآن',
    dcStock: 'مخزون المركز',
    dcStockHint: 'ما يتوفر في مركز التوزيع',
    vanInactive: 'غير نشطة',

    gate: {
      loading: 'جارٍ تجهيز سيارتك…',
      noAccess: 'غير مهيأ للمبيعات المتنقلة',
      noAccessBody: 'حسابك لا يملك دور مندوب المبيعات المتنقل. راجع المسؤول عن صلاحيات النظام.',
      notB2b: 'ليس فرع مبيعات جملة',
      notB2bBody: 'فرعك الأساسي لا يبيع بالجملة، لذلك المبيعات المتنقلة غير متاحة لك. اطلب من الموارد البشرية مراجعة فرعك.',
      noCompany: 'لم يتم العثور على شركة',
      noCompanyBody: 'صلاحية المبيعات المتنقلة لديك غير مرتبطة بشركة واحدة. اطلب من المسؤول عن الصلاحيات إسنادها على مستوى الشركة.',
      noSalesperson: 'غير مرتبط بمندوب مبيعات',
      noSalespersonBody: 'حساب الدخول الخاص بك غير مرتبط بمندوب مبيعات نشط. اطلب من مدير المبيعات ربطه.',
      noVan: 'لا توجد سيارة مخصصة',
      noVanBody: 'لم يتم تخصيص سيارة لك بعد. اطلب من مدير المبيعات تخصيص سيارة.',
      error: 'تعذر تحميل بيانات سيارتك',
    },
  },
};

export const home = { en, ar };
