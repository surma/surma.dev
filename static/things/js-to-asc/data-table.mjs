const html = String.raw;

function parseCSV(data) {
  return data
    .split("\n")
    .filter(v => v.length >= 1)
    .map(v => v.split(",").map(v => v.trim()));
}

export class DataTable {
    constructor(header, rows) {
        this.header = header;
        this.rows = rows;
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

    addColumn(name, index, f) {
        const newCol = this.rows.map((row, i) => f(row, i));
        this.rows.forEach((row, i) => row.splice(index, 0, newCol[i]));
        this.header.splice(index, 0, {name, classList: []});
        return this;
    }

    getColumn(name, mapF) {
        const colIdx = this.header.findIndex(col => col.name.toLowerCase() === name.toLowerCase());
        return this.rows.map(row => row[colIdx]);
    }

    mapColumn(name, mapF) {
        const colIdx = this.header.findIndex(col => col.name.toLowerCase() === name.toLowerCase());
        this.rows = this.rows.map(row => {
            row[colIdx] = mapF(row[colIdx]);
            return row;
        });
        return this;
    }

    classList(colName) {
        return this.header.find(col => col.name === colName)?.classList;
    }

    toHTML() {
        return html`
            <div class="data-table-wrapper">
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
                                    ${this.header.map((header, i) => html`<td class="${header.classList.join(" ")}">${row[i]}</td>`).join("")}
                                </tr>
                            `).join("")
                        }
                    </tbody>
                </table>
            </div>
        `;
    }
}