/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The Datalayer eyes, drawn natively from Primer Addons' geometry (the web draws
 * the same with SVG). Each eye is a filled ellipse in the ink with a smaller
 * one in the surface on it, so the outline keeps one width all round.
 */

import { type Gaze, type GazeName, EYE_STROKE, EYES_VIEW, eyesGeometry } from '@datalayer/primer-addons/lib/theme/portable';
import { View, type ViewStyle } from 'react-native';
import { useNativeTheme } from '../theme/tokens';

type Oval = { cx: number; cy: number; rx: number; ry: number };

/** An ellipse as a View: a circle of its width, stretched to its height. */
export function ovalStyle({ cx, cy, rx, ry }: Oval, scale: number, color: string): ViewStyle {
  const width = rx * 2 * scale;
  return {
    position: 'absolute',
    left: (cx - rx) * scale,
    top: (cy - rx) * scale,
    width,
    height: width,
    borderRadius: width / 2,
    backgroundColor: color,
    transform: [{ scaleY: ry / rx }]
  };
}

export function Eyes({
  size = 20,
  gaze = 'aside',
  label,
  ink,
  surface
}: {
  /** Height in points; the width follows the drawing. */
  size?: number;
  gaze?: Gaze | GazeName;
  /** Named only where the eyes stand alone and mean something; otherwise decoration. */
  label?: string;
  ink?: string;
  surface?: string;
}) {
  const { colors } = useNativeTheme();
  const scale = size / EYES_VIEW.height;
  const { eyes, pupils } = eyesGeometry(gaze);
  const inside = EYE_STROKE / 2;
  return (
    <View
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      style={{ width: EYES_VIEW.width * scale, height: size }}
    >
      {eyes.map((eye, index) => (
        <View key={`eye-${index}`}>
          <View style={ovalStyle({ ...eye, rx: eye.rx + inside, ry: eye.ry + inside }, scale, ink ?? colors.text)} />
          <View style={ovalStyle({ ...eye, rx: eye.rx - inside, ry: eye.ry - inside }, scale, surface ?? colors.background)} />
        </View>
      ))}
      {pupils.map((pupil, index) => (
        <View key={`pupil-${index}`} style={ovalStyle({ ...pupil, rx: pupil.r, ry: pupil.r }, scale, ink ?? colors.text)} />
      ))}
    </View>
  );
}
