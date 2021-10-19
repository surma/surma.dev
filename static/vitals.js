import { getCLS, getFID, getLCP, getTTFB, getFCP } from "web-vitals";

function measureWebVitalsMetric({ name, delta, id }) {
  self._ga.send({
    t: "event", // Hit type.
    ec: "Web Vitals", // Event category.
    ea: name, // Event action.
    el: id, // Event label.
    // GA rounds to the nearest integer. All our metrics are in ms, so that’s
    // fine. But CLS is a score that is ideally somewhere below 1.
    ev: Math.round(name === "CLS" ? delta * 1000 : delta), // Event value.
    ni: "1", // Non-interaction
  });
}

// Track additional Web Vitals metrics data.
getCLS(measureWebVitalsMetric);
getFID(measureWebVitalsMetric);
getLCP(measureWebVitalsMetric);
getTTFB(measureWebVitalsMetric);
getFCP(measureWebVitalsMetric);
