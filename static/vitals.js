import { getCLS, getFID, getLCP, getTTFB, getFCP } from "web-vitals";

window.ga = window.ga || ((...args) => (ga.q = ga.q || []).push(args));
ga("create", window._gaID, "auto");
ga("set", "transport", "beacon");
// Load the GA script
const s = document.createElement("script");
s.src = "https://www.google-analytics.com/analytics.js";
document.head.appendChild(s);

function sendToGoogleAnalytics({ name, delta, id }) {
  // Assumes the global `ga()` function exists, see:
  // https://developers.google.com/analytics/devguides/collection/analyticsjs
  ga("send", "event", {
    eventCategory: "Web Vitals",
    eventAction: name,
    // The `id` value will be unique to the current page load. When sending
    // multiple values from the same page (e.g. for CLS), Google Analytics can
    // compute a total by grouping on this ID (note: requires `eventLabel` to
    // be a dimension in your report).
    eventLabel: id,
    // Google Analytics metrics must be integers, so the value is rounded.
    // For CLS the value is first multiplied by 1000 for greater precision
    // (note: increase the multiplier for greater precision if needed).
    eventValue: Math.round(name === "CLS" ? delta * 1000 : delta),
    // Use a non-interaction event to avoid affecting bounce rate.
    nonInteraction: true,
    // Use `sendBeacon()` if the browser supports it.
    transport: "beacon",
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "hidden") {
    return;
  }
  getCLS(sendToGoogleAnalytics);
  getFID(sendToGoogleAnalytics);
  getLCP(sendToGoogleAnalytics);
  getTTFB(sendToGoogleAnalytics);
  getFCP(sendToGoogleAnalytics);
});
