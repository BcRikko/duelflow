const MAX_IMAGE_URL_LENGTH = 2048;
const HTTP_URL_PATTERN = /^https?:\/\//i;

export function isSafeImageUrl(url: string): boolean {
  if (url === '') return true;
  if (url.length > MAX_IMAGE_URL_LENGTH) return false;
  return HTTP_URL_PATTERN.test(url);
}
