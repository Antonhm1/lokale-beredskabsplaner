# Lokalt Beredskab – noter til udvikling

Statisk HTML-site på GitHub Pages (lokalt-beredskab.dk). Ingen build-step.

## Redigerbar tekst (`data-edit`)
- En redaktør kan logge ind via `login.html` (GitHub fine-grained token) og rette tekst direkte på siden. `edit.js` laver et commit via GitHub API.
- Alle elementer med **ren tekst** (ingen tags indeni) skal have attributten `data-edit`. Efter du har tilføjet eller ændret sider/sektioner, så kør:
  `node tools/tag-editable.js` (eller `--check` for kun at tjekke).
- Elementer findes efter rækkefølge, så antallet af `data-edit` i HTML-kilden skal svare til DOM'en: sæt **aldrig** `data-edit` på indhold, der genereres med JavaScript, og skriv ikke `data-edit` i inline-scripts.
- Blandet indhold (fx `<p>tekst <a>link</a></p>`) bliver ikke markeret. Skal teksten kunne redigeres, så pak den i `<span>`.
- Nye sider skal inkludere `edit.js` (`<script src="edit.js">` / `../edit.js` lige før `</body>`).
