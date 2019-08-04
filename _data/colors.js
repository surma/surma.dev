module.exports = {
  palette: {
    darkblue: "rgb(10, 49, 68)",
    blue: "rgb(3, 83, 99)",
    lightblue: "rgb(12, 105, 121)",
    purple: "rgb(142, 96, 117)",
    pink: "rgb(191, 85, 105)",
    red: "rgb(218, 59, 59)",
    orange: "rgb(207, 121, 100)",
    yellow: "rgb(247, 240, 194)",
    white: "rgb(251, 248, 228)"
  },
  convertToHex(s) {
    return (
      "#" +
      s
        .slice(4, -1)
        .split(",")
        .map(v =>
          Number(v.trim())
            .toString(16)
            .padStart(2, "0")
        )
        .join("")
    );
  }
};
