export const generateCombinations = <T>(arr: T[], k: number): T[][] => {
  if (k === 0) return [[]];
  if (k > arr.length) return [];

  const combinations: T[][] = [];

  const backtrack = (start: number, current: T[]) => {
    if (current.length === k) {
      combinations.push([...current]);
      return;
    }

    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]!);
      backtrack(i + 1, current);
      current.pop();
    }
  };

  backtrack(0, []);
  return combinations;
};
