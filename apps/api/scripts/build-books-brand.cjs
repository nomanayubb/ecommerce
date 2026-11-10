// Barkat Books brand files for the books fork (text wordmark + "BB" monogram, crimson #910f3f on cream #f2efdd). Run from apps/api: node <this file>
const sharp = require("sharp"), fs = require("fs"), path = require("path");
const OUT = path.resolve("../web-books/public"), RED = "#910f3f", CREAM = "#f2efdd", INK = "#3d081b", F = "Georgia, 'Times New Roman', serif";
const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
const word = (w, h, col, size) => svg(w, h, `<text x="50%" y="${h * 0.68}" text-anchor="middle" font-family="${F}" font-size="${size}" font-weight="700" fill="${col}" letter-spacing="1">Barkat Books</text>`);
const mono = (w, h, bg, fg, r) => svg(w, h, `${bg ? `<rect width="${w}" height="${h}" rx="${r}" fill="${bg}"/>` : ""}<text x="50%" y="${h * 0.68}" text-anchor="middle" font-family="${F}" font-size="${h * 0.56}" font-weight="700" fill="${fg}">BB</text>`);
const full = (w, h, col, sub) => svg(w, h, `<text x="50%" y="${h * 0.5}" text-anchor="middle" font-family="${F}" font-size="${h * 0.42}" font-weight="700" fill="${col}">BB</text><text x="50%" y="${h * 0.78}" text-anchor="middle" font-family="${F}" font-size="${h * 0.12}" font-weight="700" fill="${col}" letter-spacing="1">Barkat Books</text><text x="50%" y="${h * 0.9}" text-anchor="middle" font-family="${F}" font-size="${h * 0.06}" fill="${sub}">Buy Books on Discount</text>`);
const save = async (buf, file, fmt) => { const s = sharp(buf); await (fmt === "webp" ? s.webp({ quality: 90 }) : fmt === "jpg" ? s.jpeg({ quality: 88 }) : s.png()).toFile(path.join(OUT, file)); };
(async () => {
  const B = (f) => "brand/" + f;
  for (const [n, sz] of [["icon-192", 192], ["icon-512", 512], ["apple-touch-icon", 180]]) await save(mono(sz, sz, RED, CREAM, sz * 0.18), B(n + ".png"), "png");
  await save(mono(192, 192, RED, CREAM, 34), "icon-192.png", "png"); await save(mono(512, 512, RED, CREAM, 92), "icon-512.png", "png");
  const png48 = await sharp(mono(48, 48, RED, CREAM, 9)).png().toBuffer();
  const ico = Buffer.concat([Buffer.from([0, 0, 1, 0, 1, 0, 48, 48, 0, 0, 1, 0, 32, 0]), (() => { const b = Buffer.alloc(8); b.writeUInt32LE(png48.length, 0); b.writeUInt32LE(22, 4); return b; })(), png48]);
  fs.writeFileSync(path.join(OUT, "favicon.ico"), ico);
  for (const [a, w, h, sz] of [["brand/logo-horizontal", 614, 120, 78], ["logo-horizontal", 720, 189, 100]]) {
    await save(word(w, h, RED, sz), a + (a.startsWith("brand") ? ".png" : ".webp"), a.startsWith("brand") ? "png" : "webp");
    if (a.startsWith("brand")) { await save(word(w, h, RED, sz), a + ".webp", "webp"); await save(word(w, h, CREAM, sz), a + "-dark.png", "png"); await save(word(w, h, CREAM, sz), a + "-dark.webp", "webp"); }
  }
  for (const [a, w, h] of [["brand/logo-full", 720, 542], ["logo-full", 900, 809]]) {
    const fmt = a.startsWith("brand") ? "png" : "webp";
    await save(full(w, h, RED, INK), a + "." + fmt, fmt);
    if (a.startsWith("brand")) { await save(full(w, h, RED, INK), a + ".webp", "webp"); await save(full(w, h, CREAM, CREAM), a + "-dark.png", "png"); await save(full(w, h, CREAM, CREAM), a + "-dark.webp", "webp"); }
    else await save(full(w, h, CREAM, CREAM), "logo-full-white.webp", "webp");
  }
  for (const [a, w, h] of [["brand/logo-mark", 292, 192], ["logo-mark", 360, 238]]) {
    const fmt = a.startsWith("brand") ? "png" : "webp";
    await save(mono(w, h, null, RED), a + "." + fmt, fmt);
    if (a.startsWith("brand")) { await save(mono(w, h, null, RED), a + ".webp", "webp"); await save(mono(w, h, null, CREAM), a + "-dark.png", "png"); await save(mono(w, h, null, CREAM), a + "-dark.webp", "webp"); }
  }
  const og = svg(1200, 630, `<rect width="1200" height="630" fill="${RED}"/><text x="600" y="330" text-anchor="middle" font-family="${F}" font-size="120" font-weight="700" fill="${CREAM}">Barkat Books</text><text x="600" y="420" text-anchor="middle" font-family="${F}" font-size="44" fill="${CREAM}">Buy Books on Discount</text>`);
  await save(og, "og-image.jpg", "jpg"); await save(og, "brand/og-image.jpg", "jpg");
  console.log("brand files written");
})();
