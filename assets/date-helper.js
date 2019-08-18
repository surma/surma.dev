export function toISODate(date) {
  return date.toISOString().replace(/T.+$/, "");
}
