module.exports = function (table) {
  table.addColumn(
    "Average",
    table.header.length,
    (row) => {
      let runs = row.slice(table.header.length);
      runs = runs.sort().slice(5, -5);
      return runs.reduce((sum, c) => sum + parseInt(c), 0) / runs.length;
    },
    (v) => `${v.toFixed(2)}ms`
  );
  table.classList("Average").push("right");

  const base = {
    blur: table
      .copy()
      .filter({
        program: "blur",
        language: "JavaScript",
        engine: "Turbofan",
      })
      .getColumn("Average")[0],
    bubblesort: table
      .copy()
      .filter({
        program: "bubblesort",
        language: "JavaScript",
        engine: "Turbofan",
      })
      .getColumn("Average")[0],
    binaryheap: table
      .copy()
      .filter({
        program: "binaryheap",
        language: "JavaScript",
        engine: "Turbofan",
      })
      .getColumn("Average")[0],
  };
  const avgs = table.getColumn("Average");
  table.addColumn(
    "vs JS",
    table.header.length,
    (row, i) => avgs[i] / base[row[0]],
    (v) => `${v.toFixed(1)}x`
  );
  table.classList("vs JS").push("right");
  table.mapColumn("Variant", (v, row) => (row.includes("JavaScript") ? "" : v));
  ["Language", "Program", "Engine", "Variant", "Optimizer", "Runtime"]
    .forEach(name => table.classList(name).push("discrete"));
};
