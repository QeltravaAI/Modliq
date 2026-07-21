const EXTENDED_MODULES_ENV = process.env.NEXT_PUBLIC_ENABLE_EXTENDED_MODULES;

function parseBool(value: string | undefined): boolean {
  if (value === undefined || value === null) return false;
  return value.toLowerCase() === 'true' || value === '1';
}

export function isExtendedModulesEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  return parseBool(EXTENDED_MODULES_ENV);
}

export const EXTENDED_MODULE_PATHS = [
  '/supply-chain',
  '/operations',
  '/lean',
] as const;
