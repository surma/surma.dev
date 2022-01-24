/* @jsx h */
import { h } from "preact";
import { useReducer, useState } from "preact/hooks";

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
      computedValue: 0,
    }));
  }

  getCell(x, y) {
    return this.cells[y * this.cols + x];
  }

  generateCode(x, y) {
    const cell = this.getCell(x, y);
    return `(function () {
      return ${cell.value};
    })();`;
  }

  computeCell(x, y) {
    const cell = this.getCell(x, y);
    let result;
    try {
      result = eval(this.generateCode(x, y));
    } catch(e) {
      result = `#ERROR ${e.message}`;
    }
    cell.computedValue = result;
  }

  computeAllCells() {
    for(const y of range(this.rows)) {
      for(const x of range(this.cols)) {
        this.computeCell(x, y);
      }
    }
  }
}

function useSpreadsheetData(rows, cols) {
  const [{ data }, dispatch] = useReducer(
    ({ data }, { x, y, value }) => {
      const cell = data.getCell(x, y);
      cell.value = value;
      data.computeAllCells();
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
  const [isEditing, setEditing] = useState(false);

  if (isEditing) {
    return (
      <input
        type="text"
        value={cell.value}
        onblur={(ev) => {
          setEditing(false);
          set(ev.target.value);
        }}
      />
    );
  }

  return <span onclick={() => setEditing(true)}>{cell.computedValue}</span>;
}
