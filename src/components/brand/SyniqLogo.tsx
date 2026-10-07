import React from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MARK_PATH, MARK_VIEWBOX, WORDMARK_PATH, WORDMARK_VIEWBOX } from '@/components/brand/logo-paths';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * The SyniQ mark and wordmark, rendered natively from the same traced artwork syniq-web uses
 * (`scripts/sync-brand.mjs` generates `logo-paths.ts` from it, and `brand:check` guards the drift).
 *
 * ⚠ `fillRule="evenodd"` is not decoration. Both paths are single COMPOUND paths whose counters —
 * the holes inside the mark — only read as holes under the even-odd rule. Under the default
 * non-zero winding the logo fills in solid and becomes a blob.
 *
 * Colour defaults to the brand cobalt for the current theme (`colors.logo`, which has a dark
 * twin), so a logo on a dark surface does not need every call site to remember.
 */

const [, , MARK_W, MARK_H] = MARK_VIEWBOX.split(/\s+/).map(Number);
const [, , WORD_W, WORD_H] = WORDMARK_VIEWBOX.split(/\s+/).map(Number);

export const SyniqMark: React.FC<{ height?: number; color?: string }> = ({
  height = 32,
  color,
}) => {
  const theme = useTheme();
  return (
    <Svg
      width={(height * MARK_W) / MARK_H}
      height={height}
      viewBox={MARK_VIEWBOX}
      accessibilityRole="image"
      accessibilityLabel="SyniQ"
    >
      <Path d={MARK_PATH} fill={color ?? theme.colors.logo} fillRule="evenodd" />
    </Svg>
  );
};

export const SyniqWordmark: React.FC<{ height?: number; color?: string }> = ({
  height = 20,
  color,
}) => {
  const theme = useTheme();
  return (
    <Svg width={(height * WORD_W) / WORD_H} height={height} viewBox={WORDMARK_VIEWBOX}>
      <Path d={WORDMARK_PATH} fill={color ?? theme.colors.logo} fillRule="evenodd" />
    </Svg>
  );
};

/**
 * Mark + wordmark lockup.
 *
 * ⚠ The lockup itself stays LTR in both text directions, matching the artwork and syniq-web's
 * component. Only its PLACEMENT follows `dir` — a mirrored wordmark is not a translated logo, it
 * is a broken one. Hence the explicit `flexDirection: 'row'` rather than the RTL-aware default.
 */
export const SyniqLogo: React.FC<{
  orientation?: 'horizontal' | 'stacked';
  markHeight?: number;
  color?: string;
  style?: ViewStyle;
}> = ({ orientation = 'horizontal', markHeight = 32, color, style }) => {
  const stacked = orientation === 'stacked';
  return (
    <View
      style={[
        {
          flexDirection: stacked ? 'column' : 'row',
          alignItems: 'center',
          gap: stacked ? markHeight * 0.28 : markHeight * 0.35,
        },
        style,
      ]}
    >
      <SyniqMark height={markHeight} color={color} />
      <SyniqWordmark height={markHeight * (stacked ? 0.42 : 0.5)} color={color} />
    </View>
  );
};
