export default function(s) {
  const lines = s.split("\n");
  if (lines[0].trim() === "") {
    lines.splice(0, 1);
  }
  if (lines[lines.length - 1].trim() === "") {
    lines.splice(-1, 1);
  }
  const idx = lines[0].search(/\S/);
  return lines.map(line => line.slice(idx)).join("\n");
}
