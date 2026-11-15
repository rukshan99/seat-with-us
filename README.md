# Seat With Us

Find-your-table pages for **Ashinsana & Pasindu**: the wedding on 10 December 2026 and the homecoming on 13 December 2026. A guest scans the QR code, types their name and sees their table number.

| | URL | QR code |
|---|---|---|
| Wedding | https://rukshan99.github.io/seat-with-us/wedding/ | `public/qr/wedding.png` |
| Homecoming | https://rukshan99.github.io/seat-with-us/homecoming/ | `public/qr/homecoming.png` |
| Either (chosen by today's date in Sri Lanka) | https://rukshan99.github.io/seat-with-us/ | `public/qr/site.png` |

The site is static: plain HTML, CSS and a little JavaScript, built with Vite and hosted on GitHub Pages. There's no server and no login, and it works offline once a phone has opened it.

- Design brief and the reasoning behind each decision: [`docs/DESIGN.md`](docs/DESIGN.md)
- Research that informed it: [`docs/inspiration/README.md`](docs/inspiration/README.md)

---

## Update the guest list

The seating plan lives in the planning spreadsheet. The site reads two generated files, `src/data/wedding.json` and `src/data/homecoming.json`.

1. In the spreadsheet, fill in the **Table No.** column for each party. Keep one sheet per event, named `WEDDING` and `HOMECOMING`. The homecoming sheet needs a `Table No.` column header too, in the same position as on the wedding sheet.
2. Convert it:

   ```bash
   npm run import-guests -- "/path/to/Wedding_Guest_List.xlsx"
   ```

   It prints a summary, for example `wedding  343 parties, 545 guests, 62 with a table`.
3. Check the result locally (see below), then commit and push the two JSON files. The site updates itself within a couple of minutes.

**What gets published:** the party name, the note in brackets, the party size and the table. Quantities, drinks and invitation counts are not. **Everything in the name column is public**, so write each name the way the guest would want to see it. The spreadsheet itself is never committed (`*.xlsx` is git-ignored).

**How the spreadsheet is read:**

| In the spreadsheet | On the site |
|---|---|
| `Parakkarama / Achini` | **Parakkarama & Achini**. Either name finds them. |
| `Hichchi Ayya (Ranjith)` | **Hichchi Ayya**, with *Ranjith* shown underneath. Searching "Ranjith" finds them. |
| Quantity `0` | Left out (declined). |
| Empty table number | "Your seat is being arranged. An usher at the entrance will walk you to it." |
| Group heading, e.g. `Pasindu's Guests` | Not shown or published. Only used to keep each party's id stable between updates. |

Guests who looked themselves up earlier see their card again when they reopen the page. If their table changes in a later update, the card updates automatically.

## Run it locally

You need Node.js 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173/seat-with-us/wedding/. To try the production build, which includes offline support:

```bash
npm run build && npm run preview
```

```bash
npm test
```

The tests check the name matching (typos, accents, Sri Lankan spellings, people with the same name, and that every guest can find themselves) and decode every QR image to confirm it points at the live URL.

To see the phone layout, use your browser's device toolbar, or open the dev server from your phone on the same Wi-Fi: run `npm run dev -- --host` and use the network address it prints.

## How deployment works

Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. installs dependencies (`npm ci`)
2. runs the tests. **If any fail, nothing is deployed.**
3. builds the site into `dist/`
4. publishes `dist/` to GitHub Pages

One-time setup: in the repository on GitHub, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. You can watch each run under the **Actions** tab, and re-run the latest one from there with **Run workflow**.

The site lives under the `/seat-with-us/` path. That's set once as `base` in `vite.config.js`, and every link and asset path is built from it.

## Regenerate the QR codes

The QR codes and print signs are generated from the URL in `src/events.js` (`SITE_URL`).

```bash
npm run qr
```

To use a different address (for example after renaming the repository or adding a custom domain), update `SITE_URL` in `src/events.js` and `base` in `vite.config.js`, then:

```bash
npm run qr
```

```bash
npm test
```

The test decodes every QR image and fails if any still points at the old address. You can also generate codes for an address without changing the site, for example `npm run qr -- https://example.com/seat-with-us/`.

What you get in `public/qr/`:

| File | Use |
|---|---|
| `wedding.png`, `homecoming.png`, `site.png` (+ `.svg`) | Screens, WhatsApp, digital invitations |
| `print/<event>-qr.png` | 3000 px code for the invitation designer to place |
| `print/<event>-sign.svg` | **A6 entrance/table sign, vector.** Send this to the printer. |
| `print/<event>-sign.png` | The same sign at 300 dpi, for printers that prefer images |

Printing tips: keep the code at least 2.5 cm wide, and print it dark on light, even on the burgundy homecoming material (the signs already include a light panel for this). Scan a test print with an older phone before printing the full run.

## Other generated assets

| Command | Regenerates |
|---|---|
| `npm run art` | `src/art/petals.svg` (the petal artwork) and `src/art/and.svg` (the script "and") |
| `npm run images` | Favicon, home-screen icon, link previews in `public/og/`, and the photos on the page in `src/photos/` |

All of them run in plain Node, with no browser or design tools needed.

### Photos

Each event uses up to three engagement photos, chosen in `src/events.js` under `photos`:

| Key | Where it appears |
|---|---|
| `preview` | The link preview when the URL is shared on WhatsApp or iMessage |
| `petal` | Printed on the large petal on the landing page, toned to the theme (olive at the wedding, rose at the homecoming). `petalBox` places it on the petal and `petalFaces` says where the faces are, so they stay in the soft focus. |
| `keepsake` | The small print under the result card, captioned "Thank you for celebrating with us". It loads only once a result is shown. |

The sources are `assets/photos/<id>.jpg`, 1800 px copies of the shoot. To use a different photo:
1. Add its 1800 px copy to `assets/photos/`.
2. Put its id in `src/events.js`.
3. Run `npm run images`.

## Project layout

```
index.html, wedding/, homecoming/   page shells; content comes from vite/template.js
src/
  main.js          search box, suggestions, escort-card reveal, remembered result
  search.js        forgiving name matching (pure functions, tested)
  events.js        names, dates, venues, site URL
  styles/main.css  both themes, layout, motion
  data/*.json      generated guest lists
  art/*.svg        generated artwork
vite/
  template.js      the HTML for each page
  plugins.js       page rendering, inlined CSS and font preloads, service worker
  sw-template.js   offline support
scripts/           guest import, artwork, icons, QR codes
tests/             name matching and QR tests
docs/              design brief, research, invitation references
```

## Copyright

© 2026 Rukshan Jayasekara. **All rights reserved.** This repository is public so the site can be hosted on GitHub Pages, but it is published for viewing only. The code, artwork and design may not be copied or reused without written permission. See [`LICENSE`](LICENSE).

The engagement photographs, guest data and invitation designs belong to their respective owners. The fonts (Cormorant Garamond, Jost, Pinyon Script) are by their authors under the SIL Open Font License 1.1.
