export class DataTable {
    constructor(header, data) {
        this.header = header;
        this.data = data;
    }

    filterRows(prop, vals) {
        if(typeof vals === "string") {
            vals = [vals];
        }

        // const propIdxs = vals.map(val => this.header.findIndex(f => f === val));
        const propIdx = this.header.findIndex(f => f.toLowerCase() === prop.toLowerCase());
        const data = this.data.filter(row => vals.includes(row[propIdx]));
        return new DataTable(this.header.slice(), data);
    }
}