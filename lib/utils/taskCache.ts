/**
 * Module-level cache for passing task data between screens without
 * embedding it in URL params (which can corrupt navigation state).
 */

let _task: Record<string, unknown> | null = null;

export const taskCache = {
  set(task: Record<string, unknown>) {
    _task = task;
  },
  get(): Record<string, unknown> | null {
    return _task;
  },
  clear() {
    _task = null;
  },
};
