const puppeteer = require("puppeteer");

module.exports = async function () {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://twitter.com/dassurma');
  const avatarUrl = await page.evaluate(() => {
    return document.querySelector(".ProfileAvatar-image").src
  });
  return {
    "name": "Surma",
    "bio": "Web Advocate @Google. Internetrovert 🏳️‍🌈 Craving simplicity, finding it nowhere.",
    "avatar": "surma.jpg",
    "socials": {
      "twitter": "https://twitter.com/dassurma",
      "github": "https://github.com/surma",
      "instagram": "https://instagram.com/dassurma",
      "keybase": "https://keybase.io/surma",
      "podcast": "https://player.fm/series/http-203-podcast-88674",
      "rss": "https://dassur.ma/index.xml"
    }
  };
}