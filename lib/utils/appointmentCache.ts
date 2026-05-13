let _appointment: Record<string, unknown> | null = null;

export const appointmentCache = {
  set(appt: Record<string, unknown>) { _appointment = appt; },
  get(): Record<string, unknown> | null { return _appointment; },
  clear() { _appointment = null; },
};
