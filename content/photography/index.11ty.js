const { downloadGalleryPhoto } = require("../../gallery-helpers");
const html = require("../../render-string");
const quality = 40;
const size = 300;

module.exports = class Gallery {
  data() {
    return {
      pagination: {
        data: "collections.photo",
        size: 9,
        reverse: true
      },
      tags: [],
      layout: "photography"
    };
  }

  async render({ pagination }) {
    const pageLinksToShow = new Set();
    pageLinksToShow.add(1);
    pageLinksToShow.add(pagination.hrefs.length);
    pageLinksToShow.add(pagination.pageNumber);
    pageLinksToShow.add(pagination.pageNumber + 1);
    pageLinksToShow.add(pagination.pageNumber + 2);
    const pageLinks = [...pageLinksToShow]
      .sort((a, b) => a - b)
      .filter(n => n >= 1)
      .filter(n => n <= pagination.hrefs.length)
      .reduce((list, p) => {
        if (p - list[list.length - 1] > 1) {
          list.push("...");
        }
        list.push(p);
        return list;
      }, []);
    return html`
      <div class="grid" style="--gallery-size: ${size}px;">
        ${pagination.items
          .filter(entry => entry.data.live)
          .sort((a, b) => new Date(b.data.date) - new Date(a.data.date))
          .map(async item => {
            const { file, page } = item.data;
            await downloadGalleryPhoto({ file, page });
            return html`
              <a href="${item.url}">
                <preview-img
                  src="${file}"
                  width="${size}"
                  height="${size}"
                  quality="${quality}"
                  loading="lazy"
                ></preview-img>
              </a>
            `;
          })}
      </div>
      <nav>
        <a href="${pagination.previousPageHref}">&lt;</a>
        ${pageLinks.map(l =>
          l === "..."
            ? html`
                <span class="ellipsis">...</span>
              `
            : html`
                <a
                  href="${pagination.hrefs[l - 1]}"
                  class="${l - 1 === pagination.pageNumber ? "selected" : ""}"
                  >${l}</a
                >
              `
        )}
        <a href="${pagination.nextPageHref}">&gt;</a>
      </nav>
    `;
  }
};
