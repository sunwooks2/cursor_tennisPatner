const base = process.argv[2] || "http://localhost:3004";
const html = await fetch(`${base}/`).then((r) => r.text());
const match = html.match(/href="(\/_next\/static\/css\/[^"]+)"/);
if (!match) {
  console.log("CSS link not found");
  process.exit(1);
}
const cssUrl = `${base}${match[1]}`;
const cssRes = await fetch(cssUrl);
const css = await cssRes.text();
console.log("css status", cssRes.status);
console.log("css size", css.length);
console.log("has rounded-xl", css.includes(".rounded-xl"));
console.log("preview", css.slice(0, 80));
