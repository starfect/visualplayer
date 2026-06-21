// Tiny framework-free reactive store (BLUEPRINT §6.2). No dependencies.

export type Updater<T> = T | ((prev: T) => T);
export type Listener<T> = (value: T) => void;

export interface Store<T> {
  /** Current value. */
  get(): T;
  /** Replace the value (or compute it from the previous value). */
  set(next: Updater<T>): void;
  /** Shallow-merge a partial patch into the current value. */
  update(patch: Partial<T>): void;
  /** Subscribe to changes; returns an unsubscribe function. Runs immediately by default. */
  subscribe(run: Listener<T>, immediate?: boolean): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<Listener<T>>();

  const get = (): T => value;

  const set = (next: Updater<T>): void => {
    value = typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
    for (const fn of listeners) fn(value);
  };

  const update = (patch: Partial<T>): void => set((prev) => ({ ...prev, ...patch }));

  const subscribe = (run: Listener<T>, immediate = true): (() => void) => {
    listeners.add(run);
    if (immediate) run(value);
    return () => {
      listeners.delete(run);
    };
  };

  return { get, set, update, subscribe };
}
