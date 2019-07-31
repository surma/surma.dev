const RENEGADE_MAGIC_PREFIX = "//RENEGADE";
export function isRenegadeFile(code) {
  return code.startsWith(RENEGADE_MAGIC_PREFIX);
}

export function parse(code) {
  return JSON.parse(code.split("\n")[1].slice(2));
}

export function pack(id, contents) {
  return [
    RENEGADE_MAGIC_PREFIX,
    "//" + JSON.stringify({ id, contents }),
    "export default {};"
  ].join("\n");
}
