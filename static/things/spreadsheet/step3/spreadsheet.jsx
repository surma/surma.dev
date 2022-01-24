/* @jsx h */
import { h } from "preact";
import { useReducer } from "preact/hooks";

// Creates an array [0, 1, 2, ..., length]
function range(length) {
  return Array.from({ length }, (_, i) => i);
}

function spreadsheetColumn(idx) {
  return String.fromCharCode("A".charCodeAt(0) + idx);
}

class SpreadsheetData {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.cells = Array.from({ length: cols * rows }, () => ({
      value: 0,
    }));
  }

  getCell(x, y) {
    return this.cells[y * this.cols + x];
  }
}

function useSpreadsheetData(rows, cols) {
  const [{ data }, dispatch] = useReducer(
    ({ data }, { x, y, value }) => {
      const cell = data.getCell(x, y);
      cell.value = value;
      // Shallow copy so that preact doesn’t skip rendering.
      return { data };
    },
    { data: new SpreadsheetData(rows, cols) }
  );
  return [data, dispatch];
}

export default function Spreadsheet({ rows, cols }) {
  const [data, dispatch] = useSpreadsheetData(rows, cols);

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
              <Cell
                x={x}
                y={y}
                cell={data.getCell(x, y)}
                set={(value) => dispatch({ x, y, value })}
              />
            </td>
          ))}
        </tr>
      ))}
    </table>
  );
}

function Cell({ x, y, cell, set }) {
  return <span onclick={() => set(cell.value + 1)}>{cell.value}</span>;
}
