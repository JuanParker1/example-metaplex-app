export const cleanName = (name?: string): string | undefined => {
  if (!name) {
    return undefined;
  }

  return name.replace(/\s+/g, '-');
};

export const getLast = <T>(array: T[]) => {
  if (array.length <= 0) {
    return;
  }

  return array[array.length - 1];
};
