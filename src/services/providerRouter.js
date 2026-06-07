// Provider routing — Africa first, global always.
// Add new providers here as we expand to new markets.

const PROVIDER_MAP = {
  // West Africa — Dojah
  NG: 'dojah', GH: 'dojah', SN: 'dojah', CI: 'dojah',
  BJ: 'dojah', TG: 'dojah', BF: 'dojah', ML: 'dojah',

  // East Africa — Smile ID
  KE: 'smileid', TZ: 'smileid', UG: 'smileid', RW: 'smileid',
  ET: 'smileid', MZ: 'smileid', ZM: 'smileid',

  // Southern Africa
  ZA: 'dojah', BW: 'dojah', NA: 'dojah', ZW: 'dojah',

  // North Africa
  EG: 'dojah', MA: 'dojah', TN: 'dojah', DZ: 'dojah',

  // Global expansion
  GB: 'onfido', IE: 'onfido', FR: 'onfido', DE: 'onfido',
  US: 'persona', CA: 'persona', AU: 'persona',
  BR: 'serpro', MX: 'persona', CO: 'persona',
  IN: 'idfy', SG: 'myinfo', AE: 'uqudo', SA: 'uqudo'
};

const DEFAULT_PROVIDER = 'dojah';

export function getProvider(countryCode) {
  if (!countryCode) return DEFAULT_PROVIDER;
  return PROVIDER_MAP[countryCode.toUpperCase()] || DEFAULT_PROVIDER;
}

export function getSupportedCountries() {
  return Object.keys(PROVIDER_MAP);
}
