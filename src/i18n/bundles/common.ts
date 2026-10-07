/**
 * Shared strings. One bundle per area, each exporting an `en` / `ar` twin.
 *
 * ⚠ `ar: typeof en` IS THE POINT. It makes a missing Arabic key a COMPILE error rather than a screen
 * that silently falls back to English in front of a rep who cannot read it.
 *
 * Terminology is MIRRORED from syniq-web's `bundles/order-to-cash.ts` and the Operations app rather
 * than retyped, so the three clients name the same thing the same way.
 */

const en = {
  app: {
    name: 'SYNIQ Van Sales',
    // Sits under the logo on the sign-in screen. Names what the app is FOR, since the mark alone
    // is shared with syniq-web, the POS and the Operations app.
    tagline: 'B2B Van Sales',
  },

  action: {
    signIn: 'Sign in',
    signOut: 'Sign out',
    retry: 'Try again',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    search: 'Search',
    add: 'Add',
    remove: 'Remove',
    save: 'Save',
    back: 'Back',
    done: 'Done',
    change: 'Change',
    refresh: 'Refresh',
    open: 'Open',
    new: 'New',
    loadMore: 'Load more',
    clear: 'Clear',
    // The eye on the sign-in password field. Spoken by the screen reader; never drawn as text.
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },

  field: {
    identifier: 'Employee code or email',
    password: 'Password',
  },

  status: {
    loading: 'Loading…',
    signingIn: 'Signing in…',
  },

  error: {
    // This app is online-only, so a lost connection is a real stop, not a degraded mode — the
    // wording must not imply the work was saved.
    offline: 'No connection. Nothing was saved — reconnect and try again.',
    serverDown: 'The server is not responding. Nothing was saved.',
    timeout: 'The server took too long to answer. Nothing was saved.',
    sessionExpired: 'Your session has expired. Please sign in again.',
    badCredentials: 'Wrong employee code or password.',
    tooManyAttempts: 'Too many sign-ins just now. Wait a minute and try again.',
    forbidden: 'You do not have permission to do this.',
    forbiddenTitle: 'Not yours to do',
    generic: 'Something went wrong.',
  },

  list: {
    empty: 'Nothing here',
    emptyBody: 'Nothing matches what you are looking at.',
    countOf: '{{shown}} of {{total}}',
  },

  // The date picker's own words (DateField).
  common: {
    clear: 'Clear',
    notSet: 'not set',
    pickDate: 'Pick a date',
  },
};

const ar: typeof en = {
  app: {
    name: 'سينيك للمبيعات المتنقلة',
    tagline: 'مبيعات الجملة المتنقلة',
  },

  action: {
    signIn: 'تسجيل الدخول',
    signOut: 'تسجيل الخروج',
    retry: 'إعادة المحاولة',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    close: 'إغلاق',
    search: 'بحث',
    add: 'إضافة',
    remove: 'حذف',
    save: 'حفظ',
    back: 'رجوع',
    done: 'تم',
    change: 'تغيير',
    refresh: 'تحديث',
    open: 'فتح',
    new: 'جديد',
    loadMore: 'عرض المزيد',
    clear: 'مسح الحقل',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
  },

  field: {
    identifier: 'رقم الموظف أو البريد الإلكتروني',
    password: 'كلمة المرور',
  },

  status: {
    loading: 'جارٍ التحميل…',
    signingIn: 'جارٍ تسجيل الدخول…',
  },

  error: {
    offline: 'لا يوجد اتصال. لم يتم حفظ أي شيء — أعد الاتصال وحاول مرة أخرى.',
    serverDown: 'الخادم لا يستجيب. لم يتم حفظ أي شيء.',
    timeout: 'استغرق الخادم وقتًا طويلاً للرد. لم يتم حفظ أي شيء.',
    sessionExpired: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.',
    badCredentials: 'رقم الموظف أو كلمة المرور غير صحيحة.',
    tooManyAttempts: 'محاولات تسجيل دخول كثيرة الآن. انتظر دقيقة ثم حاول مرة أخرى.',
    forbidden: 'ليس لديك صلاحية للقيام بهذا الإجراء.',
    forbiddenTitle: 'إجراء غير متاح لك',
    generic: 'حدث خطأ ما.',
  },

  list: {
    empty: 'لا يوجد شيء هنا',
    emptyBody: 'لا توجد نتائج مطابقة.',
    countOf: '{{shown}} من {{total}}',
  },

  common: {
    clear: 'مسح',
    notSet: 'غير محدد',
    pickDate: 'اختر تاريخًا',
  },
};

export const common = { en, ar };
