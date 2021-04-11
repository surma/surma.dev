const html = String.raw;

export function generateUid() {
    return Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 256).toString(16)
    ).join("");
}
function parseCSV(data) {
  return data
    .split("\n")
    .filter((v) => v.length >= 1)
    .map((v) => v.split(",").map((v) => v.trim()));
}

function toDataSet(v) {
  v = JSON.stringify(v);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(v).toString("base64");
  }
  return btoa(v);
}

function fromDataSet(v) {
  return JSON.parse(atob(v));
}

export class DataTable {
  constructor(header, rows) {
    this.header = header;
    this.rows = rows;
    this.formatters = new Map();
  }

  static fromCSV(csv) {
    const rawData = parseCSV(csv);
    return new DataTable(
      rawData[0].map((name) => ({ name, classList: [] })),
      rawData.slice(1)
    );
  }

  copy() {
    return new DataTable(
      this.header.slice(),
      this.rows.map((row) => row.slice())
    );
  }

  rowMatchesPredicate(row, predicate) {
    for (let [prop, vals] of Object.entries(predicate)) {
      if (typeof vals === "string") {
        vals = [vals];
      }
      const propIdx = this.header.findIndex(
        (head) => head.name.toLowerCase() === prop.toLowerCase()
      );
      if (!vals.includes(row[propIdx])) {
        return false;
      }
    }
    return true;
  }

  filter(...predicates) {
    this.rows = this.rows.filter((row) =>
      predicates.some((predicate) => this.rowMatchesPredicate(row, predicate))
    );
    return this;
  }

  keepColumns(...columns) {
    for (let i = 0; i < this.header.length; ) {
      // If the current header is included, don’t delete the column.
      // Thank you, next.
      if (
        columns.some(
          (col) => col.toLowerCase() === this.header[i].name.toLowerCase()
        )
      ) {
        i++;
        continue;
      }
      this.header.splice(i, 1);
      this.rows.forEach((row) => row.splice(i, 1));
    }
    return this;
  }

  addColumn(name, index, f, formatter) {
    const newCol = this.rows.map((row, i) => f(row, i));
    this.rows.forEach((row, i) => row.splice(index, 0, newCol[i]));
    this.header.splice(index, 0, { name, classList: [] });
    if (formatter) {
      this.setFormatter(name, formatter);
    }
    return this;
  }

  setFormatter(name, formatter) {
    this.formatters.set(name, formatter);
  }

  getColumn(name, mapF) {
    const colIdx = this.header.findIndex(
      (col) => col.name.toLowerCase() === name.toLowerCase()
    );
    return this.rows.map((row) => row[colIdx]);
  }

  mapColumn(name, mapF) {
    const colIdx = this.header.findIndex(
      (col) => col.name.toLowerCase() === name.toLowerCase()
    );
    this.rows = this.rows.map((row) => {
      row[colIdx] = mapF(row[colIdx], row);
      return row;
    });
    return this;
  }

  classList(colName) {
    return this.header.find((col) => col.name === colName)?.classList;
  }

  _getFormatter(name) {
    if (this.formatters.has(name)) {
      return this.formatters.get(name);
    }
    return (v) => v;
  }

  toHTML(uid) {
    return html`
      <div class="data-table-wrapper" id="${uid}">
        <table class="data-table">
          <thead>
            <tr>
              ${this.header
                .map(
                  (head) =>
                    html`<th class="${head.classList.join(" ")}">
                      ${head.name}
                    </th>`
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${this.rows
              .map(
                (row) => html`
                  <tr>
                    ${this.header
                      .map(
                        (header, i) =>
                          html`<td
                            class="${header.classList.join(" ")}"
                            data-value="${toDataSet(row[i])}"
                          >
                            ${this._getFormatter(header.name)(row[i])}
                          </td>`
                      )
                      .join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }
}

function rerender(tbody, visibleRows) {
    while (tbody.firstChild) {
        tbody.firstChild.remove();
    }
    tbody.append(...visibleRows);
}


export function sortable(table) {
  table.querySelectorAll("th").forEach((th, i) => {
    const asc = document.createElement("button");
    asc.textContent = "▲";
    asc.classList.add("btn", "ascending", "sort-btn");
    th.append(asc);
    const desc = document.createElement("button");
    desc.textContent = "▼";
    desc.classList.add("btn", "descending", "sort-btn");
    th.append(desc);
  });

  table.addEventListener("click", (ev) => {
    if (!ev.target.classList.contains("sort-btn")) {
      return;
    }
    const visibleRows = [...table.querySelectorAll("tbody > tr")];
    const isAscending = ev.target.classList.contains("ascending") ? 1 : -1;
    const th = ev.target.closest("th");
    const colNumber = [...th.parentElement.children].indexOf(th);
    const colItems = visibleRows
      .map((row) => row.querySelector(`td:nth-child(${colNumber + 1})`))
      .map((cell, i) => ({ i, value: fromDataSet(cell.dataset.value) }));
    colItems.sort((a, b) =>
      a.value > b.value ? 1 * isAscending : -1 * isAscending
    );
    const newVisibleRows = [];
    for (const { i } of colItems) {
      newVisibleRows.push(visibleRows[i]);
    }
    rerender(table.querySelector("tbody"), newVisibleRows);
  });
}

export function filterable(table) {
  const tbody = table.querySelector("tbody");
  const rows = [...tbody.querySelectorAll("tr")];
  let visibleRows = rows.slice();

  table.querySelectorAll("th").forEach((th, i) => {
    if(!th.classList.contains("discrete")) {
        return;
    }
    const values = new Set(
        rows.map(row => row.children[i].dataset.value)
    );
    values.delete(toDataSet(""));
    const div = document.createElement("div")
    div.classList.add("filters");
    div.innerHTML = [...values]
            .map(value => {
                const uid = generateUid();
                return html`
                <input id="${uid}" type="checkbox" class="filter" data-column="${i}" data-value="${value}" checked>
                <label for="${uid}">
                    ${fromDataSet(value)}
                </label>
            `;
            }).join("");
    th.append(div);
  });

  table.addEventListener("change", (ev) => {
    if (!ev.target.classList.contains("filter")) {
      return;
    }

    const disabledValues = [];
    [...table.querySelectorAll("input.filter")]
        .filter(checkbox => !checkbox.checked)
        .forEach(checkbox => {
            const {column, value} = checkbox.dataset;
            if(!disabledValues[column]) {
                disabledValues[column] = new Set();
            }
            disabledValues[column].add(value);
        });
    
    visibleRows = rows.filter(row =>
        ![...row.children].some((col, i) => disabledValues[i]?.has?.(col.dataset.value))
    );
    rerender(tbody, visibleRows);
  });
}
