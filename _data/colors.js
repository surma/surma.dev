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
    white: "rgb(251, 248, 228)",
    "diff-green": "hsl(122, 61%, 87%)",
    "diff-red": "hsl(0, 86%, 27%)"
  },
  darkpalette: {
    white: "rgb(47, 43, 69)",
    yellow: "rgb(25, 23, 37)",
    orange: "rgb(32, 45, 98)",
    red: "rgb(38, 57, 125)",
    pink: "rgb(62, 63, 163)",
    purple: "rgb(128, 65, 200)",
    lightblue: "rgb(183, 86, 184)",
    blue: "rgb(184, 111, 170)",
    darkblue: "rgb(206, 166, 186)",
    "diff-green": "hsl(122, 23%, 22%)",
    "diff-red": "hsl(0, 64%, 22%)",
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
