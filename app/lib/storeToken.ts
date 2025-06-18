export function storeToken(token: string) {
  // Store in localStorage
  localStorage.setItem('token', token);

  // Store in cookie for middleware use
  document.cookie = `token=${token}; path=/; secure; SameSite=Strict`;
}
