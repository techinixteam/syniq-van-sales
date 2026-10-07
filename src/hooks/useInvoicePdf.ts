import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/api/errors';
import {
  cachedInvoicePdf,
  downloadInvoicePdf,
  openPdf,
  ReprintReasonRequired,
  sharePdf,
} from '@/services/invoice-pdf';

type Intent = 'view' | 'share';

/**
 * View / Share for one invoice — with the server's print rules handled in one place.
 *
 *   1. A copy already on this phone is used as it is (re-sharing is not a new print).
 *   2. Otherwise the PDF is downloaded — the server's first print, or a REPRINT.
 *   3. A reprint without a reason comes back as `ReprintReasonRequired`: the screen shows the
 *      ReasonModal (`needsReason`), and `submitReason` retries with it.
 */
export function useInvoicePdf(input: { invoiceId: string; companyId: string; docNumber: string }) {
  const { invoiceId, companyId, docNumber } = input;
  const { t } = useTranslation();
  const [busy, setBusy] = useState<Intent | null>(null);
  const [pendingIntent, setPendingIntent] = useState<Intent | null>(null);

  const deliver = useCallback(
    async (path: string, intent: Intent) => {
      if (intent === 'share') {
        await sharePdf(path, docNumber, t('invoice.shareTitle', { doc: docNumber }));
        return;
      }
      if ((await openPdf(path)) === 'NO_VIEWER') {
        // No PDF viewer installed: the share sheet still reaches one (Drive, WhatsApp, a printer app).
        Alert.alert(t('invoice.noViewer'), t('invoice.noViewerBody'));
        await sharePdf(path, docNumber, t('invoice.shareTitle', { doc: docNumber }));
      }
    },
    [docNumber, t],
  );

  const run = useCallback(
    async (intent: Intent, reason?: string) => {
      setBusy(intent);
      try {
        const path =
          (reason ? null : await cachedInvoicePdf(docNumber)) ??
          (await downloadInvoicePdf({ invoiceId, companyId, docNumber, reason }));
        setPendingIntent(null);
        await deliver(path, intent);
      } catch (e) {
        if (e instanceof ReprintReasonRequired) {
          setPendingIntent(intent);
          return;
        }
        setPendingIntent(null);
        Alert.alert(t('invoice.pdfFailed'), errorMessage(e, t));
      } finally {
        setBusy(null);
      }
    },
    [deliver, invoiceId, companyId, docNumber, t],
  );

  /** Fetch the first print in the background (right after a sale) so View / Share are instant. */
  const prefetch = useCallback(async () => {
    try {
      if (!(await cachedInvoicePdf(docNumber))) await downloadInvoicePdf({ invoiceId, companyId, docNumber });
    } catch {
      // Not shown: the buttons will try again and report properly if it really fails.
    }
  }, [invoiceId, companyId, docNumber]);

  return {
    busy,
    view: () => void run('view'),
    share: () => void run('share'),
    prefetch,
    needsReason: pendingIntent != null,
    submitReason: (reason: string) => void run(pendingIntent ?? 'view', reason),
    cancelReason: () => setPendingIntent(null),
  };
}
