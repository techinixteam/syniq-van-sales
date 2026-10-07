import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';
import { launchpadGrid } from '@/components/common/launchpad-grid';

/**
 * A Fiori-style launchpad: a module opens onto grouped tiles rather than a nav tree.
 *
 * A native port of `syniq-web/src/shared/ui/Launchpad.tsx`, keeping its two load-bearing rules:
 *
 *   1. **Permission gating is per TILE** (`show`).
 *   2. **A section whose every tile is hidden renders NOTHING AT ALL.** A heading over an empty
 *      grid tells a user there is something here they cannot reach, which is worse than the module
 *      simply being smaller for them.
 *
 * ⚠ Callers must compute `show` with `useHoldsPermission`, never `usePermission` — see the
 * docblock on `usePermission`. Every real user of this app is site-scoped, and the GLOBAL default
 * would hide the entire launchpad from all of them.
 *
 * The web's tiles are frosted glass (`backdrop-filter`), which has no React Native equivalent, so
 * these are flat `surface` cards carrying the same border, radius and elevation. That divergence
 * is deliberate and recorded in the plan (§4.4) and in `scripts/sync-tokens.mjs`.
 */

export interface LaunchpadTile {
  key: string;
  label: string;
  /** One line on what the tile is FOR. A tile without it is just a word. */
  description?: string;
  icon: LucideIcon;
  show: boolean;
  onPress: () => void;
  /** Optional trailing figure. Rendered small, never as the tile's subject. */
  badge?: string;
}

export interface LaunchpadSection {
  title: string;
  hint?: string;
  tiles: LaunchpadTile[];
}

export const Launchpad: React.FC<{ sections: LaunchpadSection[]; style?: ViewStyle }> = ({
  sections,
  style,
}) => {
  const theme = useTheme();

  const visible = sections
    .map((s) => ({ ...s, tiles: s.tiles.filter((t) => t.show) }))
    .filter((s) => s.tiles.length > 0);

  return (
    <View style={[{ padding: theme.spacing.screenPadding, gap: theme.spacing.xl }, style]}>
      {visible.map((section) => (
        <View key={section.title} style={{ gap: theme.spacing.md }}>
          <View>
            <Text style={[textStyles.sectionLabel, { color: theme.colors.ink2 }]}>
              {section.title}
            </Text>
            {section.hint ? (
              <Text style={[textStyles.caption, { color: theme.colors.ink3, marginTop: 2 }]}>
                {section.hint}
              </Text>
            ) : null}
          </View>

          <View style={styles.grid}>
            {section.tiles.map((tile) => (
              <Tile key={tile.key} tile={tile} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const Tile: React.FC<{ tile: LaunchpadTile }> = ({ tile }) => {
  const theme = useTheme();
  const Icon = tile.icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tile.label}
      accessibilityHint={tile.description}
      onPress={tile.onPress}
      style={({ pressed }) => [
        styles.tile,
        theme.shadows.card,
        {
          minHeight: theme.spacing.tileMinHeight,
          padding: theme.spacing.cardPadding,
          borderRadius: theme.radius.tile,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: pressed ? theme.colors.brand : theme.colors.line,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <View style={styles.tileHead}>
        <View
          style={[
            styles.iconWell,
            { borderRadius: theme.radius.control, backgroundColor: theme.colors.brandSubtle },
          ]}
        >
          <Icon size={20} color={theme.colors.brand} />
        </View>
        {tile.badge ? (
          <Text style={[textStyles.caption, { color: theme.colors.ink3 }]}>{tile.badge}</Text>
        ) : null}
      </View>

      <View style={styles.tileBody}>
        <Text numberOfLines={2} style={[textStyles.bodyStrong, { color: theme.colors.ink }]}>
          {tile.label}
        </Text>
        {tile.description ? (
          <Text numberOfLines={2} style={[textStyles.caption, { color: theme.colors.ink2 }]}>
            {tile.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // Two per row on a handheld, at any width: see `launchpad-grid.ts` for why the column gap is
  // zero and the gutter is `space-between`'s leftover rather than a fixed figure.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: launchpadGrid.rowGap,
    columnGap: launchpadGrid.columnGap,
  },
  tile: { width: `${launchpadGrid.tileWidthPct}%`, justifyContent: 'space-between' },
  tileHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  iconWell: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  tileBody: { marginTop: 12, gap: 2 },
});
