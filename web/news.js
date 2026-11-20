"use strict";
const el = id => document.getElementById(id);
const buttons = document.querySelectorAll(".filters button");
let articles = [], topic = "Alle Meldungen", limit = 12;
const day = new Intl.DateTimeFormat("de-DE", { dateStyle: "full", timeZone: "Europe/Berlin" });
const shortDate = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });
function https(value) {
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : ""; }
  catch { return ""; }
}
function text(tag, value, type) {
  const node = document.createElement(tag);
  node.textContent = value;
  if (type) node.className = type;
  return node;
}
const ranks = { Kritisch: 4, Hoch: 3, Mittel: 2, Niedrig: 1 };
function newest(a, b) {
  return (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0);
}
function render() {
  const level = el("severity").value;
  const rows = articles.filter(a => (topic === "Alle Meldungen" || a.category === topic)
    && (!level || level === (a.severity || "Ohne Einstufung")));
  if (el("sort").value === "new") rows.sort(newest);
  if (el("sort").value === "severity") {
    rows.sort((a, b) => (ranks[b.severity] || 0) - (ranks[a.severity] || 0) || newest(a, b));
  }
  el("stories").replaceChildren();
  for (const [index, item] of rows.slice(0, limit).entries()) {
    const article = document.createElement("article");
    const heading = document.createElement("h2");
    const link = text("a", item.title);
    link.href = item.url;
    heading.append(link);
    const meta = [item.source, item.category];
    if (item.date && Number.isFinite(Date.parse(item.date))) meta.push(shortDate.format(new Date(item.date)));
    const byline = text("p", meta.join(" · "), "meta");
    if (item.category === "Security") {
      const level = item.severity || "Ohne Einstufung";
      const badge = text("span", level, "level");
      badge.dataset.rank = ranks[level] || 0;
      badge.title = item.severity ? "Kritikalität laut Quelle" : "Keine Kritikalität in den Feed-Metadaten";
      byline.append(badge);
    }
    article.append(byline, heading);
    if (index === 0 && item.summary) article.append(text("p", item.summary, "excerpt"));
    el("stories").append(article);
  }
  el("more").hidden = rows.length <= limit;
  if (!rows.length) el("stories").append(text("p", "Für diese Auswahl liegen keine Meldungen vor."));
}
for (const button of buttons) button.onclick = () => {
  topic = button.textContent; limit = 12;
  buttons.forEach(b => b.setAttribute("aria-pressed", String(b === button)));
  render();
};
async function load() {
  el("retry").hidden = true;
  el("status").hidden = false;
  el("status").textContent = "Meldungen werden geladen …";
  try {
    const response = await fetch("./api/feed.json?v=2", {cache: "no-cache"});
    if (!response.ok) throw Error(response.status);
    const feed = await response.json();
    articles = feed.items.filter(a => a.title && https(a.url));
    el("date").textContent = day.format(new Date(feed.updated));
    if (https(feed.androidTestUrl)) {
      el("testlink").href = feed.androidTestUrl;
      el("testlink").hidden = false;
    }
    const stale = feed.sources.filter(s => s.stale).map(s => s.name);
    el("status").textContent = stale.length ? "Letzter verfügbarer Stand für " + stale.join(", ") + "." : "";
    el("status").hidden = !stale.length;
    render();
  } catch {
    el("status").textContent = "Der Nachrichtenfeed ist gerade nicht erreichbar.";
    el("retry").hidden = false;
  }
}
for (const id of ["severity", "sort"]) el(id).onchange = () => { limit = 12; render(); };
el("more").onclick = () => { limit += 12; render(); };
el("retry").onclick = load;
load();
