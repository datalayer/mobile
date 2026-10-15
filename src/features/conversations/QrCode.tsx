/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A QR code of a sign-in page (MOBILE M-039), to open it on another device —
 * a computer, a tablet — where the person would rather sign in. Drawn with
 * views, row by row in runs: no native module, no image decoder.
 */

import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import { View } from 'react-native';

/** Each row of the code as runs of `[dark, length]`. */
export function qrRows(text: string): { size: number; rows: [boolean, number][][] } {
  const code = qrcode(0, 'M');
  code.addData(text);
  code.make();
  const size = code.getModuleCount();
  const rows: [boolean, number][][] = [];
  for (let row = 0; row < size; row += 1) {
    const runs: [boolean, number][] = [];
    for (let col = 0; col < size; col += 1) {
      const dark = code.isDark(row, col);
      const last = runs[runs.length - 1];
      if (last && last[0] === dark) last[1] += 1;
      else runs.push([dark, 1]);
    }
    rows.push(runs);
  }
  return { size, rows };
}

export function QrCode({ value, size = 168, label }: { value: string; size?: number; label: string }) {
  const { size: modules, rows } = useMemo(() => qrRows(value), [value]);
  const cell = Math.max(1, Math.floor(size / (modules + 8)));
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ alignSelf: 'flex-start', backgroundColor: '#ffffff', padding: cell * 4 }}
    >
      {rows.map((runs, row) => (
        <View key={row} style={{ flexDirection: 'row' }}>
          {runs.map(([dark, length], index) => (
            <View key={index} style={{ width: cell * length, height: cell, backgroundColor: dark ? '#000000' : '#ffffff' }} />
          ))}
        </View>
      ))}
    </View>
  );
}
