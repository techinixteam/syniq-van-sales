/** Stock — what is on the rep's van, and what the distribution centre holds. Quantities only. */

const en = {
  vanStock: {
    title: 'My van',
    summary: '{{van}} · {{count}} items',
    filter: 'Filter by name or number',
    empty: 'Your van is empty',
    emptyBody: 'Loading the van is done at the branch.',
    noMatch: 'Nothing on your van matches.',
  },
  dcStock: {
    title: 'DC stock',
    search: 'Item name, number or barcode',
    available: 'Available',
    empty: 'The DC holds nothing right now.',
    noMatch: 'No item at the DC matches.',
    noDc: 'No distribution centre',
    noDcBody: 'There is no DC you can look at.',
  },
};

const ar: typeof en = {
  vanStock: {
    title: 'سيارتي',
    summary: '{{van}} · {{count}} صنف',
    filter: 'تصفية بالاسم أو الرقم',
    empty: 'سيارتك فارغة',
    emptyBody: 'يتم تحميل السيارة في الفرع.',
    noMatch: 'لا يوجد في سيارتك صنف مطابق.',
  },
  dcStock: {
    title: 'مخزون مركز التوزيع',
    search: 'اسم الصنف أو رقمه أو الباركود',
    available: 'المتاح',
    empty: 'لا يوجد مخزون في المركز حاليًا.',
    noMatch: 'لا يوجد صنف مطابق في المركز.',
    noDc: 'لا يوجد مركز توزيع',
    noDcBody: 'لا يوجد مركز توزيع متاح لك.',
  },
};

export const stock = { en, ar };
