export function decode(token) {
  return JSON.parse(atob(token.split(".")[1]));
}
