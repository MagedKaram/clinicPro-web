/* eslint-disable @typescript-eslint/no-explicit-any */

export function sumNumberField(rows: unknown, field: string): number {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((acc: number, row: any) => {
    const value = row?.[field];
    return acc + Number(value ?? 0);
  }, 0);
}
