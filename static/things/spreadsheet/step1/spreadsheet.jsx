/* @jsx h */
import {h} from "preact";

// Creates an array [0, 1, 2, ..., length]
function range(length) {
  return Array.from({length}, (_, i) => i);
}

export default function Spreadsheet({cols, rows}) {
  return (
    <table>
      {
        range(rows).map(y => (
          <tr>
            {
              range(cols)
                .map(x => <td><Cell x={x} y={y} /></td>)
            }
          </tr>
        ))
      }
    </table>
  );
}

function Cell({x, y}) {
	return <span>{x}/{y}</span>
}