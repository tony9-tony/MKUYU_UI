/* ==========================================================================
   MKUYU AFRICA — Home page showcase (rotating hero)
   --------------------------------------------------------------------------
   One entry per slide; order here is the order on screen.

     image       large photo (2400px wide) in assets/images/hero/
     imageSmall  the same photo at 1280px, for phones and small screens
     focus       CSS object-position: the part of the photo to keep in view
                 when the screen crops it (phones crop the sides away)
     alt         what the photo shows, for screen readers
     narrow      true = narrower text column, when the subject is mid-frame
     layout      "feature" = the photo sits as a framed card on the right over a
                 blurred copy of itself (for small photos that cannot fill the
                 screen sharply); `backdrop` is the tiny copy for the blur

   The photos were cut from the design board "MKUYUHeroAssets4Photos"
   (kept in design-source/), trimmed to 16:9 and gently enhanced.
   A slide whose `image` is null shows a clearly labelled placeholder.
   ========================================================================== */

export const SLIDE_INTERVAL_MS = 7000;

const HERO = "assets/images/hero/";

export const SLIDES = [
  {
    kind: "Project",
    image: HERO + "mkuyu-project-01.jpg",
    imageSmall: HERO + "mkuyu-project-01-1280.jpg",
    focus: "58% 50%",
    alt: "Modern apartment building with warmly lit balconies at dusk",
    eyebrow: "Our projects",
    title: "Modern living, thoughtfully built",
    description: "Explore MKUYU developments and the homes available in each one.",
    action: { label: "Explore projects", href: "projects.html" },
  },
  {
    kind: "Managing Director",
    layout: "feature",
    image: HERO + "mkuyu-md.jpg",
    backdrop: HERO + "mkuyu-md-backdrop.jpg",
    narrow: true,
    alt: "MKUYU Africa's Managing Director, standing in a suit and holding a white hard hat",
    eyebrow: "Leadership",
    title: "Meet our Managing Director",
    description: "Leading MKUYU Africa and the team that helps you rent, buy and sell property with confidence.",
    action: { label: "About MKUYU", href: "about.html" },
  },
  {
    kind: "Property",
    image: HERO + "featured-home-01.jpg",
    imageSmall: HERO + "featured-home-01-1280.jpg",
    focus: "42% 60%",
    alt: "White contemporary villa with a lit swimming pool and lawn at sunset",
    eyebrow: "Homes for sale",
    title: "Find a home worth coming back to",
    description: "Houses, villas and apartments for sale, with prices and availability straight from our sales team.",
    action: { label: "Browse homes to buy", href: "buy.html" },
  },
  {
    kind: "Property",
    image: HERO + "mkuyu-project-02.jpg",
    imageSmall: HERO + "mkuyu-project-02-1280.jpg",
    focus: "62% 50%",
    alt: "Apartment building with glass balconies and landscaped garden in golden morning light",
    eyebrow: "Homes to rent",
    title: "Rent with confidence",
    description: "Apartments and homes to rent. Choose one, leave your details, and our team will contact you. No account needed.",
    action: { label: "Browse homes to rent", href: "rent.html" },
  },
  {
    kind: "Company",
    image: HERO + "mkuyu-team.jpg",
    imageSmall: HERO + "mkuyu-team-1280.jpg",
    focus: "56% 40%",
    narrow: true,                      // keep the text left of the people
    alt: "Property advisers reviewing figures together around a meeting table",
    eyebrow: "Sell with MKUYU",
    title: "Own a property? We can help you sell it.",
    description: "Submit your property and our sales team will review it and guide you through the next steps.",
    action: { label: "Sell your property", href: "sell.html" },
  },
];
