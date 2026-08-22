import {
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
  APIConnectionError,
} from 'cloudflare';

export type CloudflareApiErrorKind =
  'unauthenticated' | 'forbidden' | 'rate-limited' | 'network' | 'unknown';

export interface ClassifiedCloudflareError {
  kind: CloudflareApiErrorKind;
  cause: unknown;
}

// Every Cloudflare API call in the extension must go through this classifier so
// that UI components only ever branch on `kind`, never on raw SDK error types.
export function classifyCloudflareError(error: unknown): ClassifiedCloudflareError {
  if (error instanceof AuthenticationError) {
    return { kind: 'unauthenticated', cause: error };
  }
  if (error instanceof PermissionDeniedError) {
    return { kind: 'forbidden', cause: error };
  }
  if (error instanceof RateLimitError) {
    return { kind: 'rate-limited', cause: error };
  }
  if (error instanceof APIConnectionError) {
    return { kind: 'network', cause: error };
  }
  return { kind: 'unknown', cause: error };
}
