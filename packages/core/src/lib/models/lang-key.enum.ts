export enum LangKey {
    no = 1,
    en = 2,
    de = 3,
    sl = 4,
    sv = 5,
}

export function getLangKeyString(langKey: LangKey) {
  return LangKey[langKey];
}

