import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, Truck } from 'lucide-react-native';
import { newIdempotencyKey } from '@/api/apiClient';
import { errorMessage, isRequestInProgress } from '@/api/errors';
import { createQuotationApi } from '@/api/o2c.api';
import { createVanSaleApi, type CreateVanSaleBody } from '@/api/van-sale.api';
import { Screen } from '@/components/common/Screen';
import { Section } from '@/components/common/Card';
import { AppInput } from '@/components/common/AppInput';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { DateField } from '@/components/common/DateField';
import { ActionBar } from '@/components/ops/ActionBar';
import { ArticleSearchSheet } from '@/components/sales/ArticleSearchSheet';
import { CustomerCard } from '@/components/sales/CustomerCard';
import { CustomerPicker } from '@/components/sales/CustomerPicker';
import { LineEditor } from '@/components/sales/LineEditor';
import { PricedSummary } from '@/components/sales/PricedSummary';
import { useTheme } from '@/contexts/ThemeContext';
import { useReadyVan } from '@/contexts/VanContext';
import { useSaleDraft } from '@/hooks/useSaleDraft';
import type { MainStackParamList } from '@/navigation/types';
import { textStyles } from '@/theme';
import { fromCivilDate, toCivilDate, todayCivil } from '@/utils/civil-date';
import { keyAfterSend, keyForSend, type DraftKey } from '@/utils/draft-idempotency';
import { formatMoney } from '@/utils/money';

type Mode = 'invoice' | 'quotation';

const plusDays = (civil: string, days: number): string => {
  const d = fromCivilDate(civil) ?? new Date();
  d.setDate(d.getDate() + days);
  return toCivilDate(d);
};

/**
 * New invoice and New quotation — ONE screen, because they are one act up to the last tap:
 * a customer, a basket, and the server's price for it.
 *
 *   invoice    `POST /o2c/van-sales` — a TAX INVOICE from the rep's van: numbered, posted, the goods
 *              taken off the van. Confirmed first, and sent under the draft's own Idempotency-Key.
 *   quotation  `POST /o2c/quotations` — an offer, saved as DRAFT, priced at the van's branch.
 */
export const NewDocumentScreen: React.FC<{ mode: Mode }> = ({ mode }) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { companyId, van } = useReadyVan();
  const invoice = mode === 'invoice';
  const draft = useSaleDraft({ companyId, van, withVanStock: invoice });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [customerRef, setCustomerRef] = useState('');
  const [shipToId, setShipToId] = useState<string | null>(null);
  const [validFrom, setValidFrom] = useState(todayCivil());
  const [validTo, setValidTo] = useState(plusDays(todayCivil(), 14));
  const [notes, setNotes] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<unknown>(null);
  const heldKey = useRef<DraftKey | null>(null);
  const done = useRef(false);

  const currency = draft.preview?.determination.currency ?? 'SAR';
  const shipTos = draft.preview?.determination.shipToAddresses ?? [];
  const inBasket = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of draft.lines) m.set(l.articleId, (m.get(l.articleId) ?? 0) + 1);
    return m;
  }, [draft.lines]);

  // A new customer may have different addresses — the old choice must not carry over.
  useEffect(() => setShipToId(null), [draft.customer?.id]);

  const [leaveAction, setLeaveAction] = useState<(() => void) | null>(null);

  // Leaving with a basket on screen asks first; a posted / saved document leaves freely.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (done.current || (draft.lines.length === 0 && !draft.customer)) return;
        e.preventDefault();
        setLeaveAction(() => () => navigation.dispatch(e.data.action));
      }),
    [navigation, draft.lines.length, draft.customer],
  );

  const datesOk = invoice || (fromCivilDate(validFrom) != null && fromCivilDate(validTo) != null && validTo >= validFrom);
  const blockedByVan = invoice && van.status !== 'ACTIVE';
  const canSubmit = draft.ready && datesOk && !posting && !blockedByVan;

  const postInvoice = useCallback(async () => {
    if (!draft.customer) return;
    setConfirmOpen(false);
    setPosting(true);
    setPostError(null);
    const body: CreateVanSaleBody = {
      companyId,
      customerId: draft.customer.id,
      vanId: van.id,
      ...(shipToId ? { shipToAddressId: shipToId } : {}),
      ...(customerRef.trim() ? { customerRef: customerRef.trim() } : {}),
      lines: draft.wire,
    };
    // ⭐ THE DRAFT'S KEY: reused for the identical body after a lost answer (the server replays its
    // stored answer instead of selling twice), dropped after any real answer.
    const sent = keyForSend(heldKey.current, JSON.stringify(body), newIdempotencyKey);
    heldKey.current = sent;
    try {
      const res = await createVanSaleApi(body, sent.key);
      heldKey.current = keyAfterSend(sent, { ok: true });
      done.current = true;
      navigation.replace('InvoiceDone', {
        invoiceId: res.invoiceId,
        docNumber: res.docNumber,
        customerName: draft.customer.primaryName,
        grossHalalas: draft.preview?.totals?.grossHalalas ?? null,
        currency,
      });
    } catch (e) {
      heldKey.current = keyAfterSend(sent, { ok: false, error: e });
      setPostError(e);
      // A refusal is often the van's stock moving under the basket — refresh the hint.
      if (!isRequestInProgress(e)) draft.reloadVanStock();
    } finally {
      setPosting(false);
    }
  }, [companyId, currency, customerRef, draft, navigation, shipToId, van.id]);

  const saveQuotation = useCallback(async () => {
    if (!draft.customer) return;
    setPosting(true);
    setPostError(null);
    try {
      const q = await createQuotationApi({
        companyId,
        customerId: draft.customer.id,
        deliveringSiteId: van.siteId,
        validFrom,
        validTo,
        ...(customerRef.trim() ? { customerRef: customerRef.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        lines: draft.wire,
      });
      done.current = true;
      navigation.replace('QuotationDetail', { quotationId: q.id, code: q.code });
    } catch (e) {
      setPostError(e);
    } finally {
      setPosting(false);
    }
  }, [companyId, customerRef, draft, navigation, notes, validFrom, validTo, van.siteId]);

  const total = draft.preview?.totals?.grossHalalas;
  const ar = i18n.language === 'ar';

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: theme.spacing.screenPadding, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxxl }}>
        {invoice ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Truck size={18} color={blockedByVan ? theme.colors.negative : theme.colors.brand} />
            <Text style={[textStyles.bodySmall, { color: blockedByVan ? theme.colors.negative : theme.colors.ink2, flex: 1 }]}>
              {blockedByVan
                ? t('sale.vanInactive', { van: van.code })
                : t('sale.fromVan', { van: van.code, branch: van.site ? `${van.site.code} ${ar ? van.site.nameAr || van.site.nameEn : van.site.nameEn}` : '' })}
            </Text>
          </View>
        ) : null}

        <Section title={t('sale.customer.title')}>
          {draft.customer ? (
            <CustomerCard companyId={companyId} customer={draft.customer} onChange={() => draft.setCustomer(null)} showCredit={invoice} />
          ) : (
            <CustomerPicker companyId={companyId} onPick={draft.setCustomer} autoFocus />
          )}
        </Section>

        {draft.customer ? (
          <Section title={t('sale.lines.title')} hint={invoice ? t('sale.lines.hintInvoice') : t('sale.lines.hintQuote')}>
            {draft.lines.map((l, i) => (
              <LineEditor
                key={l.key}
                line={l}
                index={i}
                profile={draft.profiles.get(l.articleId)}
                priced={draft.pricedByKey.get(l.key)}
                currency={currency}
                onVan={invoice && draft.vanStock ? draft.vanStock.get(l.articleId) ?? 0n : undefined}
                overVan={draft.overStock.has(l.articleId)}
                onQty={(qty) => draft.update(l.key, { qty })}
                onUnit={(uomCode) => draft.update(l.key, { uomCode })}
                onRemove={() => draft.remove(l.key)}
              />
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setSheetOpen(true)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.sm,
                height: theme.spacing.buttonHeight,
                borderRadius: theme.radius.control,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: theme.colors.brand,
                backgroundColor: pressed ? theme.colors.brandSubtle : 'transparent',
              })}
            >
              <Plus size={20} color={theme.colors.brand} />
              <Text style={[textStyles.button, { color: theme.colors.brand }]}>{t('sale.lines.add')}</Text>
            </Pressable>
          </Section>
        ) : null}

        {draft.customer && invoice ? (
          <Section title={t('sale.details')}>
            {shipTos.length > 1 ? (
              <View style={{ gap: theme.spacing.xs }}>
                <Text style={[textStyles.label, { color: theme.colors.ink2 }]}>{t('sale.shipTo')}</Text>
                {shipTos.map((a) => {
                  const selected = (shipToId ?? shipTos.find((x) => x.isDefault)?.id) === a.id;
                  return (
                    <Pressable
                      key={a.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setShipToId(a.id)}
                      style={{
                        padding: theme.spacing.md,
                        borderRadius: theme.radius.control,
                        borderWidth: 1,
                        borderColor: selected ? theme.colors.brand : theme.colors.line,
                        backgroundColor: selected ? theme.colors.brandSubtle : theme.colors.surface,
                      }}
                    >
                      <Text style={[textStyles.bodySmall, { color: theme.colors.ink }]}>{a.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <AppInput label={t('sale.customerRef')} value={customerRef} onChangeText={setCustomerRef} maxLength={120} autoCapitalize="characters" />
          </Section>
        ) : null}

        {draft.customer && !invoice ? (
          <Section title={t('sale.details')}>
            <DateField label={t('quote.validFrom')} value={validFrom} onChange={setValidFrom} />
            <DateField
              label={t('quote.validTo')}
              value={validTo}
              onChange={setValidTo}
              warn={!datesOk}
              hint={!datesOk ? t('quote.badDates') : null}
              minimumDate={fromCivilDate(validFrom) ?? undefined}
            />
            <AppInput label={t('sale.customerRef')} value={customerRef} onChangeText={setCustomerRef} maxLength={120} autoCapitalize="characters" />
            <AppInput label={t('quote.notes')} value={notes} onChangeText={setNotes} maxLength={2000} multiline style={{ height: 96, textAlignVertical: 'top', paddingTop: 12 }} />
          </Section>
        ) : null}

        {draft.customer ? (
          <Section title={t('sale.totals.title')}>
            <PricedSummary preview={draft.preview} previewing={draft.previewing} previewError={draft.previewError} onRetry={draft.retryPreview} />
          </Section>
        ) : null}

        {postError ? (
          <View style={{ padding: theme.spacing.md, borderRadius: theme.radius.control, backgroundColor: theme.colors.negativeBg }}>
            <Text style={[textStyles.bodySmall, { color: theme.colors.negative }]}>{errorMessage(postError, t)}</Text>
          </View>
        ) : null}
      </ScrollView>

      {draft.customer ? (
        <ActionBar
          summary={total ? formatMoney(total, currency) : undefined}
          hint={draft.lines.length > 0 ? t('sale.lineCount', { count: draft.lines.length }) : undefined}
          primaryLabel={invoice ? t('invoice.post') : t('quote.save')}
          onPrimary={invoice ? () => setConfirmOpen(true) : () => void saveQuotation()}
          primaryDisabled={!canSubmit}
          primaryBusy={posting}
          hideOnKeyboard
        />
      ) : null}

      <ArticleSearchSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onPick={draft.add}
        vanStock={invoice ? draft.vanStock : null}
        inBasket={inBasket}
      />

      <ConfirmModal
        visible={confirmOpen}
        title={t('invoice.confirmTitle')}
        body={t('invoice.confirmBody', {
          total: total ? formatMoney(total, currency) : '—',
          customer: draft.customer?.primaryName ?? '',
          van: van.code,
        })}
        confirmLabel={t('invoice.post')}
        busy={posting}
        onConfirm={() => void postInvoice()}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmModal
        visible={leaveAction != null}
        title={t('sale.leaveTitle')}
        body={t('sale.leaveBody')}
        confirmLabel={t('sale.leaveConfirm')}
        destructive
        onConfirm={() => {
          const go = leaveAction;
          setLeaveAction(null);
          done.current = true;
          go?.();
        }}
        onCancel={() => setLeaveAction(null)}
      />

    </Screen>
  );
};

export const NewInvoiceScreen: React.FC = () => <NewDocumentScreen mode="invoice" />;
export const NewQuotationScreen: React.FC = () => <NewDocumentScreen mode="quotation" />;
