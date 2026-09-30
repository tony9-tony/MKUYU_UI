/* ==========================================================================
   MKUYU AFRICA — Home page showcase (rotating hero)
   --------------------------------------------------------------------------
   One entry per slide. To add MKUYU's real pictures:

     1. Put the image in  assets/images/hero/  (landscape, at least 2000px
        wide, JPG or WebP; the important part of the picture near the centre
        or right, because the text sits on the left).
     2. Set `image` to its path, write a real `title` and `description`, and
        remove `sample: true`.

   A slide whose `image` is null shows a clearly labelled placeholder instead
   of a stock photo, so nothing on the site pretends to be MKUYU when it is
   not. Order here is the order on screen. Keep each image different.
   ========================================================================== */

export const SLIDE_INTERVAL_MS = 7000;

export const SLIDES = [
  {
    kind: "Project",
    image: null,                       // e.g. "assets/images/hero/project-name.jpg"
    alt: "",
    eyebrow: "Our projects",
    title: "A MKUYU development",
    description: "The name, location and a short description of the project will appear here, with its photograph.",
    action: { label: "Explore projects", href: "projects.html" },
    sample: true,
  },
  {
    kind: "Managing Director",
    image: null,                       // e.g. "assets/images/hero/managing-director.jpg"
    alt: "",
    eyebrow: "Leadership",
    title: "Managing Director",
    description: "A portrait of MKUYU's Managing Director with a short professional introduction will appear here.",
    action: { label: "About MKUYU", href: "about.html" },
    sample: true,
  },
  {
    kind: "Property",
    image: null,                       // e.g. "assets/images/hero/property-name.jpg"
    alt: "",
    eyebrow: "Homes for sale",
    title: "A featured property",
    description: "A signature MKUYU home or building, with its name and a short description, will appear here.",
    action: { label: "Browse properties to buy", href: "buy.html" },
    sample: true,
  },
  {
    kind: "Company",
    image: null,                       // e.g. "assets/images/hero/mkuyu-team.jpg"
    alt: "",
    eyebrow: "Sell with MKUYU",
    title: "Own a property? We can help you sell it.",
    description: "A photograph of the MKUYU team or office will appear here. Submit your property and our sales team will review it.",
    action: { label: "Sell your property", href: "sell.html" },
    sample: true,
  },
];
