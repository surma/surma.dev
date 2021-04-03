const html = String.raw;
export class DataTable {
    constructor(header, rows) {
        this.header = header;
        this.rows = rows;
    }

    rowMatchesPredicate(row, predicate) {
        for(let [prop, vals] of Object.entries(predicate)) {
            if(typeof vals === "string") {
                vals = [vals];
            }
            const propIdx = this.header.findIndex(f => f.toLowerCase() === prop.toLowerCase());
            if(!vals.includes(row[propIdx])) {
                return false
            }
        }
        return true
    }

    filter(...predicates) {
        const data = this.rows.filter(row => predicates.some(predicate => this.rowMatchesPredicate(row, predicate)));
        return new DataTable(this.header.slice(), data);
    }

    toHTML() {
        return html`
            <table class="data-table">
                <thead>
                    <tr>
                        ${this.header.map(head => html`<th>${head}</th>`).join("")}
                    </tr>
                </thead>
                <tbody>
                    ${
                        this.rows.map(row => html`
                            <tr>
                                ${row.map(col => html`<td>${col}</td>`).join("")}
                            </tr>
                        `).join("")
                    }
                </tbody>
            </table>
        `;
    }
}