const html = String.raw;

function parseCSV(data) {
  return data
    .split("\n")
    .filter(v => v.length >= 1)
    .map(v => v.split(",").map(v => v.trim()));
}

function toDataSet(v) {
    v = JSON.stringify(v);
    if(typeof Buffer !== "undefined") {
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
        return new DataTable(rawData[0].map(name => ({name, classList: []})), rawData.slice(1));
    }

    copy() {
        return new DataTable(this.header.slice(), this.rows.map(row => row.slice()));
    }

    rowMatchesPredicate(row, predicate) {
        for(let [prop, vals] of Object.entries(predicate)) {
            if(typeof vals === "string") {
                vals = [vals];
            }
            const propIdx = this.header.findIndex(head => head.name.toLowerCase() === prop.toLowerCase());
            if(!vals.includes(row[propIdx])) {
                return false
            }
        }
        return true
    }

    filter(...predicates) {
        this.rows = this.rows.filter(row => predicates.some(predicate => this.rowMatchesPredicate(row, predicate)));
        return this;
    }

    keepColumns(...columns) {
        for(let i = 0; i < this.header.length;) {
            // If the current header is included, don’t delete the column.
            // Thank you, next.
            if(columns.some(col => col.toLowerCase() === this.header[i].name.toLowerCase())) {
                i++;
                continue;
            }
            this.header.splice(i, 1);
            this.rows.forEach(row => row.splice(i, 1));
        }
        return this;
    }

    addColumn(name, index, f, formatter) {
        const newCol = this.rows.map((row, i) => f(row, i));
        this.rows.forEach((row, i) => row.splice(index, 0, newCol[i]));
        this.header.splice(index, 0, {name, classList: []});
        if(formatter) {
            this.setFormatter(name, formatter);
        }
        return this;
    }

    setFormatter(name, formatter) {
        this.formatters.set(name, formatter);
    }

    getColumn(name, mapF) {
        const colIdx = this.header.findIndex(col => col.name.toLowerCase() === name.toLowerCase());
        return this.rows.map(row => row[colIdx]);
    }

    mapColumn(name, mapF) {
        const colIdx = this.header.findIndex(col => col.name.toLowerCase() === name.toLowerCase());
        this.rows = this.rows.map(row => {
            row[colIdx] = mapF(row[colIdx], row);
            return row;
        });
        return this;
    }

    classList(colName) {
        return this.header.find(col => col.name === colName)?.classList;
    }

    _getFormatter(name) {
        if(this.formatters.has(name)) {
            return this.formatters.get(name);
        }
        return v => v;
    }

    toHTML(uid) {
        return html`
            <div class="data-table-wrapper" id="${uid}">
                <table class="data-table">
                    <thead>
                        <tr>
                            ${this.header.map(head => html`<th class="${head.classList.join(" ")}">${head.name}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
                        ${
                            this.rows.map(row => html`
                                <tr>
                                    ${this.header.map((header, i) => html`<td class="${header.classList.join(" ")}" data-value="${toDataSet(row[i])}">${this._getFormatter(header.name)(row[i])}</td>`).join("")}
                                </tr>
                            `).join("")
                        }
                    </tbody>
                </table>
            </div>
        `;
    }
}

function ascendingSorter(a, b) {
    if(a == b) {
        return 0;
    }
    if(a > b) {
        return 1
    }
    return -1;
}

function descendingSorter(a, b) {
    return -ascendingSorter(a, b);
}


export function interactive(table) {
    const tbody = table.querySelector("tbody");
    const rows = [...tbody.querySelectorAll("tr")]
    let visibleRows = rows.slice();

    for(const th of table.querySelectorAll("th")) {
        const asc = document.createElement("button");
        asc.textContent = "▲"
        asc.classList.add("btn", "ascending", "sort-btn");
        th.append(asc);
        const desc = document.createElement("button");
        desc.textContent = "▼"
        desc.classList.add("btn", "descending", "sort-btn");
        th.append(desc);
    }
    for(const td of table.querySelectorAll("td")) {
        const asc = document.createElement("button");
        asc.textContent = "✘"
        asc.classList.add("btn", "hide-btn");
        td.append(asc);
    }
    
    {
        const reset = document.createElement("button");
        reset.textContent = "⟳"
        reset.classList.add("btn", "reset-btn");
        table.querySelector("th:first-child").append(reset);
    }

    function rerender() {
        while(tbody.firstChild) {
            tbody.firstChild.remove();
        }
        tbody.append(...visibleRows);
    }

    table.addEventListener("click", ev => {
        if(!ev.target.classList.contains("sort-btn")) {
            return;
        }
        const isAscending = ev.target.classList.contains("ascending") ? 1 : -1;
        const th = ev.target.closest('th');
        const colNumber = [...th.parentElement.children].indexOf(th);
        const colItems = visibleRows.map(row => row.querySelector(`td:nth-child(${colNumber+1})`)).map((cell, i) => ({i, value: fromDataSet(cell.dataset.value)}));
        colItems.sort((a, b) => a.value > b.value ? 1 * isAscending : -1 * isAscending);
        const prevVisibleRows = visibleRows.slice();
        visibleRows = []
        for(const {i} of colItems) {
            visibleRows.push(prevVisibleRows[i]);
        }
        rerender();
    });
    table.addEventListener("click", ev => {
        if(!ev.target.classList.contains("hide-btn")) {
            return;
        }
        const td = ev.target.closest("td");
        const colNumber = [...td.parentElement.children].indexOf(td);
        const valRemoval = td.dataset.value;
        visibleRows = visibleRows.filter(row => row.children[colNumber].dataset.value !== valRemoval);
        rerender();
    });
    table.addEventListener("click", ev => {
        if(!ev.target.classList.contains("reset-btn")) {
            return;
        }
        visibleRows = rows.slice();
        rerender();
    });
}