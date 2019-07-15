async function run() {
  if (!IntersectionObserver) {
    return;
  }
  const carousels = [...document.querySelectorAll("section.carousel")];
  if (carousels.length <= 0) {
    return;
  }
  const io = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          return;
        }
        io.unobserve(entry.target);
        entry.target.scrollTo({ left: 0, behavior: "smooth" });
      }
    },
    {
      threshold: 0.3
    }
  );

  for (const carousel of carousels) {
    carousel.scrollLeft = carousel.scrollWidth;
    io.observe(carousel);
  }
}
run();
