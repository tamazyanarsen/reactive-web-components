export const parseValue = (v: any) => {
  try {
    return JSON.parse(v);
  } catch (e) {
    return v;
  }
};
