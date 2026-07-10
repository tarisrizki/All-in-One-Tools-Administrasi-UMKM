export const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

export const keysToCamel = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToCamel(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result, key) => {
        result[snakeToCamel(key)] = keysToCamel(obj[key]);
        return result;
      },
      {} as any
    );
  }
  return obj;
};
