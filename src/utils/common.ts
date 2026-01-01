export const toggleSet = <T>(set: Set<T>, value: T) => {
  if (set.has(value)) set.delete(value);
  else set.add(value);
};
