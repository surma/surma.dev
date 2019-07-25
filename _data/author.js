const puppeteer = require("puppeteer");

const baseData = {
  name: "Surma",
  bio: "Undefined, lol",
  avatar: "surma.png",
  socials: {
    twitter: "https://twitter.com/dassurma",
    github: "https://github.com/surma",
    instagram: "https://instagram.com/dassurma",
    keybase: "https://keybase.io/surma",
    podcast: "https://player.fm/series/http-203-podcast-88674",
    rss: "https://dassur.ma/index.xml"
  }
};

async function grabBio() {
  const browser = await puppeteer.launch();
  let data;
  try {
    const page = await browser.newPage();
    await page.goto("https://twitter.com/dassurma");
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    const bio = await page.evaluate(() => {
      let bio = document.querySelector("[data-testid=UserDescription]");
      if (!bio) {
        bio = document.querySelector(".ProfileHeaderCard-bio");
      }
      bio.querySelectorAll("*[aria-hidden=true]").forEach(el => el.remove());
      bio.querySelectorAll("img").forEach(el => el.replaceWith(el.alt));
      bio.querySelectorAll(".twitter-timeline-link").forEach(el => el.remove());
      return bio.textContent;
    });
    data = { ...baseData, bio };
  } catch (e) {
    const bio = `Error: ${e.message}`;
    data = { ...baseData, bio };
  }
  browser.close();
  return data;
}

module.exports = grabBio();
