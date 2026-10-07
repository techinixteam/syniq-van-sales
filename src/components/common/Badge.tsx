import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';

/**
 * The five Fiori semantics, and the one place a document status is turned into a colour.
 *
 * ⚠ COLOUR IS NEVER THE ONLY SIGNAL. Every badge carries its own words, because a colour-blind
 * operator under warehouse sodium lighting cannot tell `critical` from `negative`, and the
 * difference between them here is "check this" and "this failed".
 */
export type Semantic = 'positive' | 'critical' | 'negative' | 'info' | 'neutral';

export const Badge: React.FC<{
  label: string;
  tone?: Semantic;
  style?: ViewStyle;
}> = ({ label, tone = 'neutral', style }) => {
  const theme = useTheme();

  const tones: Record<Semantic, { fg: string; bg: string }> = {
    positive: { fg: theme.colors.positive, bg: theme.colors.positiveBg },
    critical: { fg: theme.colors.critical, bg: theme.colors.criticalBg },
    negative: { fg: theme.colors.negative, bg: theme.colors.negativeBg },
    info: { fg: theme.colors.info, bg: theme.colors.infoBg },
    neutral: { fg: theme.colors.neutral, bg: theme.colors.neutralBg },
  };
  const c = tones[tone];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: c.bg, borderRadius: theme.radius.control, borderColor: c.fg },
        style,
      ]}
    >
      <Text numberOfLines={1} style={[textStyles.label, { color: c.fg }]}>
        {label}
      </Text>
    </View>
  );
};

/**
 * Document status → semantic, for every document this app touches.
 *
 * ONE table rather than a ternary per screen: a transfer that is amber on the list and grey on the
 * detail is a bug report, and the statuses are shared across five flows.
 *
 * ⚠ Unknown statuses fall to `neutral` ON PURPOSE. The server holds these vocabularies in CHECK
 * constraints rather than Postgres enums specifically so a new status can be added without a type
 * migration — so one WILL appear here that this table has never seen, and it must render as a
 * plain grey chip carrying its own name rather than throw or render blank.
 */
const STATUS_TONE: Record<string, Semantic> = {
  // Neutral — nothing has happened yet.
  DRAFT: 'neutral',
  CREATED: 'neutral',
  PLANNED: 'neutral',
  OPEN: 'neutral',
  // Info — in flight, someone else's move.
  IN_REVIEW: 'info',
  PENDING_APPROVAL: 'info',
  SUBMITTED: 'info',
  ASSIGNED: 'info',
  STARTED: 'info',
  LOADING: 'info',
  LOADED: 'info',
  ISSUED: 'info',
  SENT: 'info',
  ACKNOWLEDGED: 'info',
  DEPARTED: 'info',
  COUNTED: 'info',
  IN_TRANSIT: 'info',
  // Positive — done, and done correctly.
  APPROVED: 'positive',
  ACCEPTED: 'positive',
  CONFIRMED: 'positive',
  POSTED: 'positive',
  RECEIVED: 'positive',
  COMPLETED: 'positive',
  VERIFIED: 'positive',
  DELIVERED: 'positive',
  CLEARED: 'positive',
  ACTIVE: 'positive',
  FULFILLED: 'positive',
  // Critical — needs a human.
  PARTIALLY_RECEIVED: 'critical',
  PARTIALLY_CONFIRMED: 'critical',
  PARTIALLY_FULFILLED: 'critical',
  PAUSED: 'critical',
  DISCREPANCY: 'critical',
  CHANGE_REQUESTED: 'critical',
  QUALITY_HOLD: 'critical',
  // Negative — stopped, refused or written off.
  CANCELLED: 'negative',
  REJECTED: 'negative',
  REFUSED: 'negative',
  RETURNED: 'negative',
  VOID: 'negative',
  BLOCKED: 'negative',
  RECALLED: 'negative',
  EXPIRED: 'negative',
  REVERSED: 'negative',
};

export const toneForStatus = (status: string | null | undefined): Semantic =>
  (status ? STATUS_TONE[status] : undefined) ?? 'neutral';

/**
 * A status chip.
 *
 * `label` is passed in rather than derived, so the WORDS come from the i18n bundle and the COLOUR
 * from the raw code. A translated label must never change how a status is coloured.
 */
export const StatusBadge: React.FC<{ status: string; label?: string; style?: ViewStyle }> = ({
  status,
  label,
  style,
}) => <Badge label={label ?? status} tone={toneForStatus(status)} style={style} />;

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
