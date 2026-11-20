# GovSecRadar

Die responsive Nachrichtenseite lädt beim Öffnen `./api/feed.json`. GitHub Actions aktualisiert diese öffentliche JSON-Schnittstelle stündlich aus den RSS-Feeds des Bundestags, von CERT-Bund und CERT-EU. Die Startseite mischt die neuesten Einträge der Quellen abwechselnd. Der Themenfilter arbeitet auf denselben Daten. Jede Überschrift führt zum Original.

Für eine lokale Vorschau im Repository:
```sh
python3 tools/feed.py
python3 -m http.server --directory web 8000
```

Der Workflow veröffentlicht ausschließlich den Ordner `web/`. In den Pages-Einstellungen ist GitHub Actions die Veröffentlichungsquelle. Bei einem Quellfehler verwendet der Build, soweit verfügbar, die zuletzt gespeicherten Meldungen dieser Quelle. Ein vollständiger Abrufausfall lässt die letzte Veröffentlichung online.

Die Repository-Variable `ANDROID_TEST_URL` nimmt den freigegebenen HTTPS-Einladungslink zum Android-Test auf. Ohne Link zeigt der App-Bereich den Teststatus. Die Betreiberlinks im Footer führen zur Website von 3imsinn.
