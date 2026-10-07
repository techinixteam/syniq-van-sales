/** You — who is signed in, which van they sell from, and the settings that belong to this phone. */

const en = {
  profile: {
    title: 'You',
    account: 'Account',
    username: 'Employee code',
    email: 'Email',
    name: 'Name',
    branch: 'Home branch',
    noBranch: 'No home branch',
    roles: 'Roles',
    noRoles: 'No roles assigned',
    van: 'Van',
    salesperson: 'Salesperson',
    noVan: 'No van assigned to you.',

    language: 'Language',
    english: 'English',
    arabic: 'العربية',
    restartRequired: 'Restart needed',
    restartRequiredBody: 'Close the app completely and open it again so the screen lays out in the right direction.',

    theme: 'Appearance',
    themeSystem: 'Follow the device',
    themeLight: 'Light',
    themeDark: 'Dark',

    about: 'About',
    version: 'Version',
    server: 'Server',
    signOutConfirm: 'Sign out?',
    signOutConfirmBody: 'You will need your password to sign in again.',
  },
};

const ar: typeof en = {
  profile: {
    title: 'حسابك',
    account: 'الحساب',
    username: 'رقم الموظف',
    email: 'البريد الإلكتروني',
    name: 'الاسم',
    branch: 'الفرع الأساسي',
    noBranch: 'لا يوجد فرع أساسي',
    roles: 'الأدوار',
    noRoles: 'لا توجد أدوار مسندة',
    van: 'السيارة',
    salesperson: 'مندوب المبيعات',
    noVan: 'لا توجد سيارة مخصصة لك.',

    language: 'اللغة',
    english: 'English',
    arabic: 'العربية',
    restartRequired: 'يلزم إعادة التشغيل',
    restartRequiredBody: 'أغلق التطبيق تمامًا ثم افتحه من جديد ليظهر بالاتجاه الصحيح.',

    theme: 'المظهر',
    themeSystem: 'حسب الجهاز',
    themeLight: 'فاتح',
    themeDark: 'داكن',

    about: 'عن التطبيق',
    version: 'الإصدار',
    server: 'الخادم',
    signOutConfirm: 'تسجيل الخروج؟',
    signOutConfirmBody: 'ستحتاج إلى كلمة المرور لتسجيل الدخول مرة أخرى.',
  },
};

export const profile = { en, ar };
