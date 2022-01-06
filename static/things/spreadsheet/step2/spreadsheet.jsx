/* @jsx h */
import { h } from "preact";

// Creates an array [0, 1, 2, ..., length]
function range(length) {
  return Array.from({ length }, (_, i) => i);
}

function spreadsheetColumn(idx) {
  return String.fromCharCode("A".charCodeAt(0) + idx);
}

export default function Spreadsheet({ cols, rows }) {
  return (
    <table>
      <tr>
        <td />
        {range(cols).map((x) => (
          <td>{spreadsheetColumn(x)}</td>
        ))}
      </tr>
      {range(rows).map((y) => (
        <tr>
          <td>{y}</td>
          {range(cols).map((x) => (
            <td>
              <Cell x={x} y={y} />
            </td>
          ))}
        </tr>
      ))}
    </table>
  );
}

function Cell({ x, y }) {
  return (
    <span>
      {x}/{y}
    </span>
  );
}
