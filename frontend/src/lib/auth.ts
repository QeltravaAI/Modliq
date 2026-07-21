export function verifyJwt(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload && payload.userId && payload.email) {
      return payload as { userId: string; email: string };
    }
    return null;
  } catch {
    return null;
  }
}

export function getAuthFromHeaders(headers: Headers) {
  const auth = headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}
