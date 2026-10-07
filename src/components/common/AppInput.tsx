import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';

/**
 * A labelled text field.
 *
 * `textAlign` is left unset so RN resolves it from the layout direction — an Arabic field must
 * align right without every call site remembering to say so.
 *
 * `secureToggle` adds a show/hide eye to a `secureTextEntry` field. The reveal state lives HERE,
 * not in the caller: the caller keeps saying `secureTextEntry` and this component decides whether
 * the glyphs are masked right now. It sits at the logical END of the row, so under RTL it mirrors
 * to the left with the rest of the layout instead of colliding with right-aligned Arabic text.
 */
export const AppInput: React.FC<
  TextInputProps & { label?: string; error?: string | null; secureToggle?: boolean }
> = ({ label, error, style, secureToggle, secureTextEntry, ...props }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);

  const hasToggle = Boolean(secureToggle && secureTextEntry);
  // Room for the eye so the last typed character never hides under it.
  const toggleWidth = theme.spacing.inputHeight;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[textStyles.label, { color: theme.colors.ink2, marginBottom: theme.spacing.xs }]}>
          {label}
        </Text>
      ) : null}

      <View style={styles.row}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.colors.ink3}
          secureTextEntry={secureTextEntry && !revealed}
          style={[
            textStyles.body,
            styles.fill,
            {
              height: theme.spacing.inputHeight,
              paddingHorizontal: theme.spacing.inputPaddingHorizontal,
              borderRadius: theme.radius.control,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: error ? theme.colors.negative : theme.colors.field,
              backgroundColor: theme.colors.surface,
              color: theme.colors.ink,
            },
            hasToggle ? { paddingEnd: toggleWidth } : null,
            style,
          ]}
          {...props}
        />

        {hasToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? t('action.hidePassword') : t('action.showPassword')}
            onPress={() => setRevealed((v) => !v)}
            hitSlop={8}
            style={[styles.toggle, { width: toggleWidth, height: theme.spacing.inputHeight }]}
          >
            {revealed ? (
              <EyeOff size={22} color={theme.colors.ink2} />
            ) : (
              <Eye size={22} color={theme.colors.ink2} />
            )}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={[textStyles.caption, { color: theme.colors.negative, marginTop: theme.spacing.xs }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  row: { width: '100%', justifyContent: 'center' },
  fill: { width: '100%' },
  // Overlaid on the field rather than laid out beside it, so the border stays one unbroken
  // rectangle around both the text and the eye.
  toggle: {
    position: 'absolute',
    end: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
