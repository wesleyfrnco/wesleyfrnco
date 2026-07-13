const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const posts = event.client_payload.posts;

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350 });

  const renderUrl = 'file://' + path.resolve(__dirname, 'render.html');

  for (const post of posts) {
    const postId = post.id;
    const slides = post.slides;
    const outDir = path.resolve(__dirname, 'posts', postId);
    fs.mkdirSync(outDir, { recursive: true });

    await page.goto(renderUrl, { waitUntil: 'networkidle0' });

    for (let i = 0; i < slides.length; i++) {
      const texto = slides[i];
      const indice = i + 1;
      const total = slides.length;

      await page.evaluate(
        (texto, indice, total) => {
          setSlide(texto, indice, total);
        },
        texto, indice, total
      );

      // pequena espera para garantir reflow do texto antes do screenshot
      await new Promise(r => setTimeout(r, 150));

      const filePath = path.join(outDir, `slide-${indice}.jpg`);
      await page.screenshot({
        path: filePath,
        type: 'jpeg',
        quality: 92
      });

      console.log(`Gerado: ${filePath}`);
    }
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
