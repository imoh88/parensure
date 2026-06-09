let _med: Record<string, unknown> | null = null;

export const medicationCache = {
  set(med: Record<string, unknown>) { _med = med; },
  get(): Record<string, unknown> | null { return _med; },
  clear() { _med = null; },
};
