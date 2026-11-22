import i18n from '@/i18n';

export type MudraErrorCode =
  | 'AUTH'
  | 'NOT_FOUND'
  | 'BAD_PIN'
  | 'LOCKED'
  | 'PHONE_TAKEN'
  | 'VALIDATION'
  | 'FORBIDDEN'
  | 'BAD_STATE'
  | 'VERSION_CONFLICT'
  | 'INSUFFICIENT_FUNDS'
  | 'LISTING_UNAVAILABLE'
  | 'OWN_LISTING'
  | 'RATE_LIMIT'
  | 'UTR_USED'
  | 'NETWORK'
  | 'UNKNOWN';

export class MudraError extends Error {
  public readonly code: MudraErrorCode;
  public readonly detail: string;

  constructor(code: MudraErrorCode, detail: string = '', message?: string) {
    const resolvedMessage = message || formatMudraErrorMessage(code, detail);
    super(resolvedMessage);
    this.name = 'MudraError';
    this.code = code;
    this.detail = detail;
  }
}

const MUDRA_ERROR_REGEX = /MUDRA:([A-Z_]+)(?::([^\n\r]*))?/;

export function formatMudraErrorMessage(code: MudraErrorCode, detail: string = ''): string {
  const cleanDetail = (detail || '').trim();

  switch (code) {
    case 'BAD_PIN': {
      const tries = parseInt(cleanDetail, 10);
      if (Number.isFinite(tries) && tries > 0) {
        return i18n.t('errors.BAD_PIN', { tries, count: tries });
      }
      return i18n.t('errors.BAD_PIN_GENERIC');
    }
    case 'LOCKED': {
      const minutes = parseInt(cleanDetail, 10);
      return i18n.t('errors.LOCKED', { minutes: Number.isFinite(minutes) ? minutes : 5 });
    }
    case 'VALIDATION':
      if (cleanDetail && !cleanDetail.includes('MUDRA:')) {
        return cleanDetail.toLowerCase();
      }
      return i18n.t('errors.VALIDATION');
    case 'AUTH':
    case 'NOT_FOUND':
    case 'PHONE_TAKEN':
    case 'FORBIDDEN':
    case 'BAD_STATE':
    case 'VERSION_CONFLICT':
    case 'INSUFFICIENT_FUNDS':
    case 'LISTING_UNAVAILABLE':
    case 'OWN_LISTING':
    case 'RATE_LIMIT':
    case 'UTR_USED':
    case 'NETWORK':
      return i18n.t(`errors.${code}`);
    case 'UNKNOWN':
    default:
      return cleanDetail ? cleanDetail.toLowerCase() : i18n.t('errors.UNKNOWN');
  }
}

/**
 * Parses any Supabase / PostgREST / fetch error into a typed `MudraError`.
 */
export function parseMudraError(err: unknown): MudraError {
  if (err instanceof MudraError) {
    return err;
  }

  const rawMessage =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message || '')
      : String(err || '');

  const match = rawMessage.match(MUDRA_ERROR_REGEX);
  if (match) {
    const code = (match[1] as MudraErrorCode) || 'UNKNOWN';
    const detail = (match[2] || '').trim();
    return new MudraError(code, detail);
  }

  const lower = rawMessage.toLowerCase();
  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('offline') ||
    lower.includes('timeout')
  ) {
    return new MudraError('NETWORK', rawMessage);
  }

  return new MudraError('UNKNOWN', rawMessage);
}

export function isMudraError(err: unknown, code?: MudraErrorCode): err is MudraError {
  if (!(err instanceof MudraError)) return false;
  return code ? err.code === code : true;
}
