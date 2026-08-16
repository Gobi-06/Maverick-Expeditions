# Maverick Expeditions — static site

A hand-written HTML / CSS / JavaScript rebuild of the Maverick Expeditions
home page. No WordPress, no Elementor, no jQuery, no build step. Open
`index.html` in a browser and it runs.

## Layout

```
maverick-site/
├── index.html              single page, semantic sections
├── README.md
└── assets/
    ├── css/style.css       one stylesheet, numbered sections
    ├── js/main.js          one script, no dependencies
    ├── fonts/              Erode (display) + Inter (body), self-hosted
    └── img/                47 photographs, logo, favicon, avatars
```

## Running it

Any static host works. For local development, anything that serves files
over HTTP is fine — fonts will not load from `file://` in some browsers:

```bash
python -m http.server 8899
```

Then open <http://localhost:8899>.

To deploy, upload the whole `maverick-site` folder. There is no server-side
code and nothing to compile.

## Design tokens

Everything visual is driven by custom properties at the top of `style.css`
under `:root`. Change them there and the whole page follows.

| Token | Value | Used for |
| --- | --- | --- |
| `--ink` | `#090909` | primary dark background |
| `--ink-soft` | `#131313` | alternating dark band |
| `--lime` | `#ddff6d` | accent — buttons, labels, marquee |
| `--paper` | `#ffffff` | light sections |
| `--paper-mute` | `#eaeaea` | testimonial band |
| `--font-display` | Erode | all headings, buttons |
| `--font-body` | Inter | body copy, navigation |
| `--container` | `1345px` | max content width |
| `--radius` | `20px` | cards, media |

Type scales with the viewport through `clamp()`, so there are no separate
font-size breakpoints to maintain.

## Sections

| Anchor | Section |
| --- | --- |
| `#top` | Hero — headline over a grid of destination cards |
| `#services` | Eight service tiles, one per traveller group |
| `#why` | Why choose Maverick — five reasons |
| `#destinations` | Region list beside two looping tour columns |
| `#about` | Fanned photo deck beside the company statement |
| `#highlights` | Destination carousel |
| `#attractions` | Per-state attraction lists |
| `#faq` | Image beside an accordion |
| — | Lime marquee band |
| — | Mission quote with a scattered photo collage |
| `#testimonials` | Six traveller quotes |
| `#journal` | Three journal cards |
| `#contact` | Footer — contact, links, newsletter |

## Effects

Every motion in the original theme is reproduced here without its libraries.

| Effect | Original | Here |
| --- | --- | --- |
| Preloader | theme CSS + jQuery | spinning conic mask, cleared on `load` |
| Hero sequence | GSAP + ScrollTrigger pin | `position: sticky` + one scroll-progress value |
| Section reveals | WOW.js + animate.css | `IntersectionObserver` + named keyframes |
| Circular gallery | CSS animation, jQuery trigger | same keyframes, observer trigger |
| Tour columns | Swiper vertical autoplay | CSS keyframe + cloned cards |
| Highlights slider | Swiper | ~60 lines of vanilla JS |
| Marquee | theme JS | CSS keyframe on duplicated tracks |
| Button label roll | `btn-text-parallax` | `::after` clone sliding under the label |
| Title underline | `title-hover-line` | `background-size` wipe |
| Image drift | `hover-imge-effect2` | `scale(1.07) translateX(-10px)` |
| Sticky header | theme JS | class toggles on scroll direction |
| Smooth scroll | Lenis | rAF easing toward a wheel-driven target |

### Smooth scroll

`initSmoothScroll` eases the **real** scroll position rather than transforming
a wrapper, so `position: sticky` (which the hero pin needs), anchor links, the
scrollbar and find-in-page all keep working. A wheel event moves a target; a
rAF loop walks `window.scrollY` toward it at `ease: 0.12`.

Three things it deliberately gets out of the way for:

- **Touch devices** (`pointer: coarse`) and reduced-motion — native scrolling.
- **`[data-native-scroll]` subtrees**, so the open drawer scrolls normally.
- **Any scroll it did not cause.** Each frame compares the position against
  what the loop last wrote; if something else moved the page — `scrollIntoView`,
  a focused field, the scrollbar — it yields instead of dragging you back.

One caveat worth knowing: do **not** put `scroll-behavior: smooth` on `html`.
The browser would then animate every one of the loop's per-frame steps and the
page crawls. The stylesheet sets `scroll-behavior: auto` with a comment saying so.

### The hero timeline

The hero is the one genuinely complex piece. `.hero` is
`100vh + 4000px` tall and `.hero__pin` sticks for that distance. On every
frame JS turns scroll position into a single progress value `p`, maps it onto
a 3.2-unit timeline, and writes transforms:

| Time | Scene |
| --- | --- |
| 0 → 1.2 | the centre card rises from below the fold |
| 1.2 → 2.2 | eyebrow fades out, headline slides in, six side cards fan outward, captions appear |
| 2.2 → 3.2 | copy lifts, cards drop into a bottom row, the CTA fades up |

Card destinations are stored in the `HERO_CARDS` table in `main.js` as
`[x vw, y vh, scale]` pairs for each scene, so the composition holds at any
window size. Below 1024px the pin is disabled entirely and CSS lays the hero
out as a static grid.

## JavaScript

`assets/js/main.js` is one IIFE of eleven small functions: preloader, hero
timeline, reveals, circular gallery, sticky header, drawer, accordion,
carousel, ticker, newsletter, and back-to-top.

Notes:

- **The newsletter has no backend.** It validates and confirms client-side
  only — point it at your mail service to make it live.
- Reveal animations hide their targets, so that rule is gated behind a `.js`
  class set by an inline script in `<head>`. With scripting off, nothing is
  hidden and the page still reads.
- Every animation is disabled under `prefers-reduced-motion: reduce`, and the
  hero falls back to its static layout.

## Notes

- Images are cropped to the exact dimensions the layout uses, so nothing is
  downscaled in the browser and there is no layout shift; `width`/`height` are
  on every `<img>`.
- Photographs come from Wikimedia Commons under free licences. If you publish
  commercially, check each file's individual licence and add attribution.
- Testimonials and journal posts are placeholder copy with monogram avatars
  rather than stock portraits — swap in real ones before launch.
- The single page uses in-page anchors. To split it into multiple pages,
  reuse the same `header` and `footer` markup and keep the stylesheet shared.
