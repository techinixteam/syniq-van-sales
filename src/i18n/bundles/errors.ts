/**
 * Server error codes, in words a van rep can act on — standing at a customer's counter.
 *
 * ⚠ THE KEY IS THE SERVER'S `code`, VERBATIM. `api/errors.ts` builds `err.${code}` and looks it up
 * here; the key list IS the set of translated codes. A code that is not here falls back to the
 * server's English `detail` — deliberately, because a missing translation must never blank the
 * message.
 *
 * Each sentence answers "what do I do now?". Where the answer is "call someone", it says who.
 */

const en = {
  err: {
    // ── Authorization ──────────────────────────────────────────────────────────────────────────
    FORBIDDEN: 'You do not have permission for this.',
    PERMISSION_DENIED: 'You do not have permission for this.',
    SCOPE_DENIED: 'Your role does not cover this company. Ask your sales manager to check your access.',
    SITE_CAPABILITY_DENIED: 'Your branch is not a B2B branch, so van sales are closed to you. Ask HR to check your branch.',
    SOD_VIOLATION: 'The same person cannot do both halves of this. Someone else has to complete it.',
    MAKER_CHECKER: 'You raised this, so you cannot also approve it. Ask a manager.',

    // ── Transport / platform ───────────────────────────────────────────────────────────────────
    TOO_MANY_REQUESTS: 'Too many requests just now. Wait a minute and try again.',
    NOT_FOUND: 'That no longer exists. Go back and reload the list.',
    CONFLICT: 'Someone else changed this while you were working. Reload and try again.',
    UNIQUE_VIOLATION: 'That already exists.',
    STALE_VERSION: 'Someone else changed this while you were working. Reload and try again.',
    INTERNAL_ERROR: 'The server hit a problem. Nothing was saved — try again.',
    // A double-post the key exists to prevent: the first one went through.
    IDEMPOTENCY_KEY_REUSED: 'This was already sent. Check your invoices before sending it again.',
    // The first tap is still being posted. Tapping again with the same draft replays its answer.
    REQUEST_IN_PROGRESS: 'Your last tap is still being posted. Wait a few seconds and tap again — it will not be posted twice.',

    // ── The rep's own van ──────────────────────────────────────────────────────────────────────
    O2C_NO_SALESPERSON_LINK: 'Your login is not linked to a salesperson. Ask your sales manager to link it.',
    O2C_VAN_NOT_ASSIGNED_TO_YOU: 'This van is not assigned to you. Ask your sales manager.',
    O2C_VAN_INACTIVE: 'This van is inactive. Ask your sales manager to reactivate it.',
    O2C_VAN_INSUFFICIENT_STOCK: 'Your van does not hold enough of an item.',
    O2C_VAN_BRANCH_MISMATCH: 'This van belongs to another branch.',

    // ── Selling ────────────────────────────────────────────────────────────────────────────────
    O2C_ORDER_BLOCKED: 'This customer is blocked — you cannot sell to them.',
    O2C_CUSTOMER_NOT_SELLABLE: 'This customer cannot be sold to yet. Ask the office to complete their sales terms.',
    O2C_CREDIT_BLOCKED: 'Credit control refused this sale.',
    AR_CREDIT_BLOCKED: 'Credit control refused this invoice.',
    CREDIT_HOLD: 'This customer is on credit hold.',
    O2C_LINE_NOT_PRICED: 'An item has no price for this customer. Remove it or ask the pricing team.',
    O2C_UOM_NOT_CONVERTIBLE: 'An item cannot be sold in that unit. Pick another unit.',
    PRICE_UOM_NOT_ON_ARTICLE: 'An item cannot be sold in that unit. Pick another unit.',
    PRICING_UOM_REQUIRED: 'Pick a unit for every item.',
    O2C_SHIP_TO_FOREIGN: 'That delivery address belongs to another customer.',
    O2C_NO_PROFIT_CENTER: 'Your branch is not set up for invoicing yet. Ask finance.',
    O2C_DELIVERING_SITE_UNDETERMINED: 'The branch could not be worked out for this customer. Ask the office.',
    AR_ZERO_VALUE_DOCUMENT: 'This invoice comes to zero. Check the prices before posting.',
    AR_DETERMINATION_MISSING: 'Finance has not finished setting up invoicing. Ask finance.',
    PERIOD_NOT_OPEN: 'The accounting period is not open. Ask finance to open it.',
    PERIOD_LOCKED: 'The accounting period is locked. Ask finance.',
    CUSTOMER_MERGED: 'This customer was merged into another one. Search for them again.',

    // ── Stock leaving the van ──────────────────────────────────────────────────────────────────
    NEGATIVE_STOCK: 'Your van does not hold enough stock for this.',
    O2C_BATCH_REQUIRED: 'An item on your van is batch-managed and cannot be sold here yet. Ask the office.',
    BATCH_REQUIRED: 'An item on your van is batch-managed and cannot be sold here yet. Ask the office.',
    BATCH_INSUFFICIENT: 'A batch on your van does not hold enough.',
  },

  /** Why credit control said no — one line each, under the `*_CREDIT_BLOCKED` sentence. */
  creditReason: {
    AR_NOT_ON_ACCOUNT: 'The customer is not set up to buy on account. Ask the office to enable it.',
    AR_OVER_CREDIT_LIMIT: 'This sale takes the customer over their credit limit.',
    AR_OVERDUE_DAYS_EXCEEDED: 'The customer has invoices overdue for too long.',
    AR_OVERDUE_AMOUNT_EXCEEDED: 'The customer owes too much that is already overdue.',
    AR_OLDEST_ITEM_TOO_OLD: 'The customer’s oldest open invoice is too old.',
    AR_PROMISSORY_NOTE_REQUIRED: 'A promissory note is required for this customer.',
    AR_CUSTOMER_SALES_BLOCKED: 'The customer is blocked for sales.',
    AR_CUSTOMER_DELIVERY_BLOCKED: 'The customer is blocked for deliveries.',
    AR_CUSTOMER_BILLING_BLOCKED: 'The customer is blocked for billing.',
  },
};

const ar: typeof en = {
  err: {
    FORBIDDEN: 'ليست لديك صلاحية لهذا الإجراء.',
    PERMISSION_DENIED: 'ليست لديك صلاحية لهذا الإجراء.',
    SCOPE_DENIED: 'دورك لا يشمل هذه الشركة. اطلب من مدير المبيعات مراجعة صلاحياتك.',
    SITE_CAPABILITY_DENIED: 'فرعك ليس فرع مبيعات جملة، لذلك المبيعات المتنقلة غير متاحة لك. اطلب من الموارد البشرية مراجعة فرعك.',
    SOD_VIOLATION: 'لا يمكن لنفس الشخص تنفيذ طرفي هذا الإجراء. يجب أن يكمله شخص آخر.',
    MAKER_CHECKER: 'أنت من أنشأ هذا المستند، فلا يمكنك اعتماده. اطلب ذلك من المدير.',

    TOO_MANY_REQUESTS: 'طلبات كثيرة في وقت قصير. انتظر دقيقة ثم حاول مرة أخرى.',
    NOT_FOUND: 'لم يعد هذا موجوداً. ارجع وأعد تحميل القائمة.',
    CONFLICT: 'قام شخص آخر بتعديل هذا أثناء عملك. أعد التحميل وحاول مرة أخرى.',
    UNIQUE_VIOLATION: 'هذا موجود بالفعل.',
    STALE_VERSION: 'قام شخص آخر بتعديل هذا أثناء عملك. أعد التحميل وحاول مرة أخرى.',
    INTERNAL_ERROR: 'حدثت مشكلة في الخادم. لم يتم حفظ شيء — حاول مرة أخرى.',
    IDEMPOTENCY_KEY_REUSED: 'تم إرسال هذا من قبل. راجع فواتيرك قبل إرساله مرة أخرى.',
    REQUEST_IN_PROGRESS: 'ما زال طلبك السابق قيد الترحيل. انتظر بضع ثوانٍ ثم اضغط مرة أخرى — لن يتم ترحيله مرتين.',

    O2C_NO_SALESPERSON_LINK: 'حساب الدخول الخاص بك غير مرتبط بمندوب مبيعات. اطلب من مدير المبيعات ربطه.',
    O2C_VAN_NOT_ASSIGNED_TO_YOU: 'هذه السيارة غير مخصصة لك. راجع مدير المبيعات.',
    O2C_VAN_INACTIVE: 'هذه السيارة غير نشطة. اطلب من مدير المبيعات إعادة تفعيلها.',
    O2C_VAN_INSUFFICIENT_STOCK: 'سيارتك لا تحتوي على كمية كافية من أحد الأصناف.',
    O2C_VAN_BRANCH_MISMATCH: 'هذه السيارة تابعة لفرع آخر.',

    O2C_ORDER_BLOCKED: 'هذا العميل محظور — لا يمكنك البيع له.',
    O2C_CUSTOMER_NOT_SELLABLE: 'لا يمكن البيع لهذا العميل بعد. اطلب من المكتب استكمال شروط البيع الخاصة به.',
    O2C_CREDIT_BLOCKED: 'رفضت إدارة الائتمان هذا البيع.',
    AR_CREDIT_BLOCKED: 'رفضت إدارة الائتمان هذه الفاتورة.',
    CREDIT_HOLD: 'هذا العميل موقوف ائتمانياً.',
    O2C_LINE_NOT_PRICED: 'أحد الأصناف ليس له سعر لهذا العميل. احذفه أو راجع فريق التسعير.',
    O2C_UOM_NOT_CONVERTIBLE: 'لا يمكن بيع أحد الأصناف بهذه الوحدة. اختر وحدة أخرى.',
    PRICE_UOM_NOT_ON_ARTICLE: 'لا يمكن بيع أحد الأصناف بهذه الوحدة. اختر وحدة أخرى.',
    PRICING_UOM_REQUIRED: 'اختر وحدة لكل صنف.',
    O2C_SHIP_TO_FOREIGN: 'عنوان التسليم هذا يخص عميلاً آخر.',
    O2C_NO_PROFIT_CENTER: 'فرعك غير مهيأ للفوترة بعد. راجع الإدارة المالية.',
    O2C_DELIVERING_SITE_UNDETERMINED: 'تعذر تحديد الفرع لهذا العميل. راجع المكتب.',
    AR_ZERO_VALUE_DOCUMENT: 'قيمة هذه الفاتورة صفر. راجع الأسعار قبل الترحيل.',
    AR_DETERMINATION_MISSING: 'لم تنته الإدارة المالية من إعداد الفوترة. راجع الإدارة المالية.',
    PERIOD_NOT_OPEN: 'الفترة المحاسبية غير مفتوحة. اطلب من الإدارة المالية فتحها.',
    PERIOD_LOCKED: 'الفترة المحاسبية مقفلة. راجع الإدارة المالية.',
    CUSTOMER_MERGED: 'تم دمج هذا العميل في عميل آخر. ابحث عنه مرة أخرى.',

    NEGATIVE_STOCK: 'سيارتك لا تحتوي على مخزون كافٍ لهذا.',
    O2C_BATCH_REQUIRED: 'أحد الأصناف في سيارتك يُدار بالدفعات ولا يمكن بيعه من هنا بعد. راجع المكتب.',
    BATCH_REQUIRED: 'أحد الأصناف في سيارتك يُدار بالدفعات ولا يمكن بيعه من هنا بعد. راجع المكتب.',
    BATCH_INSUFFICIENT: 'إحدى الدفعات في سيارتك لا تحتوي على كمية كافية.',
  },

  creditReason: {
    AR_NOT_ON_ACCOUNT: 'العميل غير مهيأ للشراء بالآجل. اطلب من المكتب تفعيل ذلك.',
    AR_OVER_CREDIT_LIMIT: 'هذا البيع يتجاوز الحد الائتماني للعميل.',
    AR_OVERDUE_DAYS_EXCEEDED: 'لدى العميل فواتير متأخرة لمدة طويلة.',
    AR_OVERDUE_AMOUNT_EXCEEDED: 'لدى العميل مبالغ متأخرة تتجاوز الحد المسموح.',
    AR_OLDEST_ITEM_TOO_OLD: 'أقدم فاتورة مفتوحة لدى العميل قديمة جداً.',
    AR_PROMISSORY_NOTE_REQUIRED: 'يلزم سند لأمر لهذا العميل.',
    AR_CUSTOMER_SALES_BLOCKED: 'العميل محظور من المبيعات.',
    AR_CUSTOMER_DELIVERY_BLOCKED: 'العميل محظور من التسليم.',
    AR_CUSTOMER_BILLING_BLOCKED: 'العميل محظور من الفوترة.',
  },
};

export const errors = { en, ar };
