# Seat With Us — Design Brief

> Status: **approved 15 Nov 2026**, with the decisions in §13.
> References: `docs/reference/invitation-*.webp` (the printed cards), `docs/inspiration/README.md` (research).

## 1. The subject

**What it is:** a digital *escort card*. At a wedding, an escort card is the small folded card at the entrance with your name and table number on it. This page does that job for two events.

**Who it's for:** Sri Lankan family guests of every generation, from Pasindu's university friends to Ashinsana's grandmother. They'll be using phones of all ages, on resort Wi-Fi or patchy mobile data, standing at an entrance with a bag or a child in one hand.

**What it does:** you type your name and see your table number. That is the whole job, and everything below is there to support it.

## 2. Two events: context instead of choices

The wedding (10 Dec) and the homecoming (13 Dec) are different days, venues and seating plans. Each one has its own address and its own QR code:

| URL | QR printed on | Theme |
|---|---|---|
| `/seat-with-us/wedding/` | wedding card / Suriya Resort entrance sign | **Day**: ivory and olive |
| `/seat-with-us/homecoming/` | homecoming card / Eagles' Lagoon entrance sign | **Evening**: oxblood and rose |
| `/seat-with-us/` | (safety net for people who type the URL) | Picks the event from today's date in Sri Lanka time: up to 11 Dec shows the wedding, from 12 Dec the homecoming |

Every page also has a small switch at the top, *Wedding · Homecoming*, for anyone who scanned the wrong code.

**Why:** Joy's search makes you pick an event *before* you can type. Here the QR code has already told us which event the guest is at, so asking again would be a wasted step. The best choice is one the user never has to make, as long as they can still undo it if we guessed wrong.

## 3. Aesthetic direction: the invitation, brought to life

The guest has just looked at a printed card, so the screen should feel like that card coming alive: the same paper colour, petals in the top-right corner bleeding off the edge, and the same letterspaced capitals.

The petals are **our own vector artwork** in the spirit of the card, not a copy of it. They're ruffled, fan-shaped petals with fine radiating veins and a light edge, generated as SVG, so they:
- stay perfectly sharp on any screen,
- weigh a few KB,
- take their colours from the theme, so one drawing serves both events,
- can move a little.

- **Phone:** the screen *is* the card, edge to edge.
- **Desktop:** the card floats on the coloured surround exactly as in the invitation mockups (moss for the wedding, deep oxblood for the homecoming), about 28 rem wide. This turns the "what do we do with all this desktop space" problem into the brand itself.

### Why one fixed theme per event (and no automatic dark mode)

- **The wedding reception starts at 11 AM at a beach resort.** In bright sunlight, dark text on a light background is the most readable combination, while dark screens turn into mirrors. The card is ivory too.
- **The homecoming runs 6:30–11 PM in a dim hall.** A white screen would dazzle the guest and light up their face. The card is oxblood.

So the theme follows the **event's lighting and its card**, which tells us more than the phone's dark-mode setting does. Both themes pass WCAG AA (see §4). *(Correction to my earlier note: I'd assumed a dim venue for everything. The invitation shows the wedding reception is in daylight.)*

## 4. Colour (sampled from the cards, contrast-checked)

**Day: Wedding**

| Token | Hex | Role | Contrast on Paper |
|---|---|---|---|
| `paper` | `#EEE7DA` | Page background (sampled from the card) | n/a |
| `paper-raised` | `#F6F1E7` | Escort-card surface | n/a |
| `ink` | `#1F1E17` | Names, input text, table number | **13.6 : 1** |
| `olive` | `#55542F` | Labels, helper text, focus ring, button | **6.3 : 1** |
| `sage` | `#9E9A79` | Petal mid-tone, hairlines; **decoration only** | 2.3 : 1 (never used for text) |
| `moss` | `#6B6A46` | Desktop surround (the card's backdrop) | n/a |

**Evening: Homecoming**

| Token | Hex | Role | Contrast on Oxblood |
|---|---|---|---|
| `oxblood` | `#3A0709` | Page background | n/a |
| `wine` | `#4E0C10` | Escort-card surface: a lifted layer, not flat black (the Linear lesson) | n/a |
| `blush` | `#F3E3DC` | Names, input text, table number | **13.9 : 1** |
| `rose` | `#E8B4A8` | Labels, focus ring, button | **9.5 : 1** |
| `petal` | `#D99789` | Helper text | **7.2 : 1** |
| `clay` | `#A9544A` | Petal shadows, hairlines; **decoration only** | 3.3 : 1 (never used for text) |

**Rule:** each theme has exactly one accent (olive or rose), and it marks only things you can act on or that have keyboard focus.

## 5. Typography

| Role | Face | Why |
|---|---|---|
| **Display**: couple names, guest name, table number | **Cormorant Garamond** 500, all caps, +0.04em tracking; lining figures | The closest open-licence match to the card's names. Its numerals are elegant at very large sizes, which matters because the number is the hero. |
| **Labels**: "THE WEDDING OF", "TABLE", the switch | **Jost** 400, all caps, +0.22em tracking, 12–13 px | Matches the card's wide geometric capitals (Futura family). |
| **Body and input** | **Jost** 400/500, sentence case, 18–20 px | Clear for older eyes. 20 px in the input also stops iPhones zooming in when the field is tapped. |
| **"and"** | An **inline SVG path** traced from an open-licence script font, not a font file | A whole script font for three letters would add 30–40 KB. As a path it costs about 1 KB. |

Fonts are self-hosted as woff2 files trimmed to Latin characters. Only three files load (Cormorant 500, Jost 400, Jost 500), about 60 KB in total, and the display face is preloaded. Fallback font metrics are adjusted (`size-adjust`) so text doesn't jump when the real fonts arrive.

**Type scale, mobile → desktop.** The sizes are set by hand rather than from a ratio, because there are only a few of them and each has a single job.

| Use | Mobile | Desktop |
|---|---|---|
| Labels (caps) | 12 px | 13 px |
| Helper / caption | 15 px | 15 px |
| Body / suggestion rows | 18 px | 18 px |
| Input | 20 px | 20 px |
| Couple names | 30 px | 44 px |
| Guest name on card | 32 px | 40 px |
| **Table number** | `clamp(8rem, 42vw, 12rem)` | 12 rem (192 px) |

## 6. Spacing and layout

A 4 px base step, with the scale `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`. There is a 24 px side margin on phones, a single column, and everything lines up on one left edge, like the card.

**The keyboard problem.** On a phone, the on-screen keyboard covers the bottom half of the screen. When the input gets focus, the couple's names shrink and the input slides to the top, so the suggestions appear *above* the keyboard instead of under it. Most search pages get this wrong.

The input is **not** focused automatically on phones. That would open the keyboard immediately and hide the invitation before the guest has recognised it. On desktop, where there's no on-screen keyboard, the input *is* focused automatically.

```
 SEARCH (resting)                 SEARCH (typing)                 RESULT
┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
│ Wedding · Homecoming │        │ ASHINSANA & PASINDU  │        │ Wedding · Homecoming │
│              ╭─petals│        │┌────────────────────┐│        │              ╭─petals│
│ THE WEDDING OF  ╭╯   │        ││ kasun            × ││        │┌────────────────────┐│
│ ASHINSANA     ╭╯     │        │└────────────────────┘│        ││    KASUN PERERA    ││
│   and                │        │  Kasun Perera        │        ││ ·················· ││ ← fold
│ PASINDU              │        │  Kasun Perera        │        ││       TABLE        ││
│                      │        │   Mahesh's guests · 2│        ││                    ││
│ FIND YOUR TABLE      │        │  Kasuni Karunarathne │        ││         4          ││
│┌────────────────────┐│        │░░░░░░░░░░░░░░░░░░░░░░│        ││                    ││
││ Your name          ││        │░░░░░ keyboard ░░░░░░░│        ││   Party of two     ││
│└────────────────────┘│        │░░░░░░░░░░░░░░░░░░░░░░│        │└────────────────────┘│
│ First name is enough │        │░░░░░░░░░░░░░░░░░░░░░░│        │  Search another name │
└──────────────────────┘        └──────────────────────┘        └──────────────────────┘
```

Touch targets are at least 48 px everywhere. The input is 60 px tall and each suggestion row 56 px. Suggestion rows also show a quiet second line when two people share a name, for example "Mahesh's guests · party of 2", so guests can tell the two Kasuns apart without guessing.

## 7. Signature: the escort card

The one thing people will remember is that **the result arrives as a folded card opening.**

The card hinges open from a dotted fold line (rotating from about 75° to flat, 600 ms, easing out). The guest's name is on the top half. The table number then rises gently into place on the bottom half. This is built entirely from CSS transforms on text that's already on the page, so it loads nothing. *(Stripe Press: a memorable moment, without the blank loading screen.)*

**The risk I'm taking:** the table number is huge, bigger than the guest's name and the couple's names together, and it partly overlaps the petal illustration. A big number with a small label is usually a template move. Here it's honestly the right call, because the number is the *only* thing the guest needs to remember on the walk to their seat. Grandparents can read it at arm's length, and it's easy to show to an usher.

**Remembering:** after a successful lookup, the phone remembers the result on that device. If the guest reopens the page on the way to their seat, their card is waiting, with a *"Not you? Search again"* link.

## 8. Motion principles

1. **Content is never animated into view.** Text is readable the moment it paints. Only the petals drift in, about 800 ms after first paint, and they never hold anything up.
2. **Three durations:** 150 ms for small feedback (focus, press), 250 ms for the suggestions list, and 600–900 ms only for the card reveal, which happens once.
3. **One easing curve:** `cubic-bezier(0.2, 0.8, 0.2, 1)`, a strong ease-out. Nothing bounces, because bouncing looks like a toy, not a wedding.
4. **Reduced motion:** if the phone is set to reduce motion, every transform becomes a 150 ms fade. The reveal still feels like a moment, just without movement.

## 9. Search behaviour

- **Forgiving:** ignores capitals, accents and punctuation. Matches the start of any word in a name, so "achi" finds "Parakkarama / Achini". Allows one typo in short words and two in longer ones.
- **Tuned to Sri Lankan spellings:** the same name is often spelled several ways in English. The search treats these as equal: `th`/`t`, `w`/`v`, `ee`/`i`, `oo`/`u`, doubled letters, and `aiya`/`ayya`, so Jayawardhana = Jayawardena and Sooriya = Suriya.
- **Kinship words and titles count for less:** *Akka, Ayya, Malli, Nangi, Uncle, Aunty, Mama, Mr., Mrs., Miss* can still match, but they never push a real name match down the list.
- **Live suggestions** start after 2 letters, show the top 5, and support the arrow keys plus Enter.
- **No premature errors:** "not found" only appears after the guest stops typing for 600 ms with at least 3 letters, or presses Enter. *(This is Zola's mistake, avoided.)*
- **Built by hand rather than with a library** (about 120 lines). This keeps the Sri Lankan spelling rules ours, makes them easy to test, and keeps the code tiny.

## 10. Words

The tone is warm, short and specific. Errors don't apologise or stay vague.

| Moment | Copy |
|---|---|
| Label | **Find your table** |
| Placeholder | Your name |
| Helper | First name or surname is enough. |
| Result | KASUN PERERA · TABLE · **4** · Party of two |
| No table yet | Your seat is being arranged. An usher at the entrance will walk you to it. |
| Not found | No match for "Kasn Pera". Try just your first name, or the name on your invitation. Our ushers at the entrance have the full list. |
| Reset | Search another name |

## 11. Accessibility and performance

- **Accessibility:** visible label; the standard ARIA pattern for a search box with a suggestion list, which screen readers understand. A live region announces "3 matches" and "Kasun Perera, table 4". Focus moves to the result. A 3 px focus ring in the accent colour, offset from the element. Zooming is never disabled. Every text colour pair is listed in §4.
- **Performance target:** HTML, CSS and JS under 30 KB compressed. Fonts about 60 KB. Petal artwork about 25 KB (AVIF/WebP). **Under 120 KB on first load**, with no framework.
- **Stack:** Vite builds plain HTML, CSS and JS into two pages. It handles the `/seat-with-us/` base path, adds content hashes to file names, minifies, and runs the font and image pipeline. React or similar isn't worth its 40 KB+ for one input and one card.
- **Guest data:** built into the JS file, so there's no second download before search works. A script converts your spreadsheet into JSON.
- **Privacy:** only the display name, the note in brackets (needed to tell apart two guests with the same name, e.g. "Swarna Akka (Wadduwa)"), the group, the table and the party size are published. Quantities, drinks and invitation counts are not. **Everything in the spreadsheet's name column is public**, so it should read the way a guest would want to see it. Guest names never appear in the page's HTML. They live in a data file loaded by script, so search engines have nothing to index. *(We considered `noindex`, but it would fail Lighthouse's SEO audit, and here it would protect nothing the design doesn't already.)*
- **Offline:** a small service worker stores the page after the first visit. A guest who opened the link at home can still find their table on weak resort signal. Pages always try the network first (giving up after 3 s), so an updated guest list reaches everyone who has signal.

## 12. Self-critique: what I changed after checking against generic defaults

The `frontend-design` skill warns that AI design tends to fall back on *cream background + high-contrast serif + terracotta accent*. The wedding theme is close to that, but the invitation itself sets the direction, and the brief wins. Here's how this design stays specific to Ashinsana and Pasindu:

- **The accent is the card's olive, not terracotta.** The serif appears only in the card's tracked capitals, never as a big italic headline.
- **The petals are the identity**, cropped from their own invitation, not a generic flourish.
- **Two themes, day and evening, tied to the real times of the events.**
- **Revised:** I first planned a full-screen engagement photo as the background. I dropped it because it competed with the petals, broke continuity with the card, and cost about 100 KB. The photos will be used for the **link preview** instead (WhatsApp/iMessage, where this link will mostly be shared).
- **Revised:** dark by default → light for the daytime wedding (§3).
- **Chanel test:** I removed a planned confetti burst on the reveal. The card opening is the moment, and one accessory is enough.

## 13. Decisions (15 Nov 2026)

1. **Petal artwork:** nothing is cropped from the invitation images, since a crop can't meet the quality bar. We draw original vector petals instead (see §3).
2. **Photos:** used where they matter most, in the **link preview** that appears when the URL is shared on WhatsApp or iMessage, with one preview per event. They stay off the page itself so the petals and the escort card have the screen to themselves.
3. **Offline:** yes, using a service worker (see §11).
