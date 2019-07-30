export function copyRegexp(regexp) {
  return new RegExp(regexp.source, regexp.flags);
}