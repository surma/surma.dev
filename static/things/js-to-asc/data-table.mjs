export class DataTable {
    constructor(header, data) {
        this.header = header;
        this.data = data;
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
        const data = this.data.filter(row => predicates.some(predicate => this.rowMatchesPredicate(row, predicate)));
        return new DataTable(this.header.slice(), data);
    }
}