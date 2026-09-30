/* ==========================================================================
   MKUYU AFRICA — public catalogue data
   --------------------------------------------------------------------------
   SAMPLE / DEMONSTRATION DATA ONLY.

   MKUYU Africa's public website could not be located during the audit (no
   reachable official domain, and no publicly published project or property
   catalogue). Nothing in this file is a real MKUYU listing. Every record is
   invented purely to demonstrate the layout, and each is marked `sample: true`
   so it can never be mistaken for a genuine property.

   To go live, replace the contents of `PROJECTS` and `PROPERTIES` with the
   real catalogue and drop the `sample` flags. Nothing else needs to change:
   the rendering code reads these arrays and nothing more.

   Amounts are in Tanzanian shillings (TZS).
   ========================================================================== */

export const COMPANY = {
  name: "MKUYU Africa",
  tagline: "Quality homes. Real ownership.",
  vision: "One million modern, affordable homes across Tanzania.",
  ceo: "Juneid Othman",
  // Verified from Tanzanian press coverage (The Citizen / Daily News, 2026).
  // No public contact channel is published, so these are left EMPTY rather
  // than invented. Fill them from an official source before launch.
  phone: "",
  email: "",
  address: "Dar es Salaam, Tanzania",
};

/* The programme named in Tanzanian press coverage. */
export const PROGRAMMES = [
  {
    slug: "miliki-ardhi-diaspora",
    name: "Miliki Ardhi Diaspora",
    summary: "A programme enabling Tanzanians living abroad to begin owning property in Tanzania while still overseas, through structured, professionally managed purchase arrangements.",
    highlights: [
      "Structured purchase arrangements for diaspora buyers",
      "Instalment payment plans available on applicable terms",
      "Professional management rather than informal arrangements",
    ],
    announced: 2026,
  },
];

export const SERVICES = [
  { icon: "🏠", title: "Property development", text: "Homes, apartments and mixed developments built to a standard families can be proud of, in locations that stay useful for years." },
  { icon: "📄", title: "Property sales", text: "A clear buying journey: verified titles, transparent pricing, and written terms agreed before any money changes hands." },
  { icon: "🔑", title: "Property rental", text: "Rental homes and lettings managed professionally, with proper agreements for both owner and tenant." },
  { icon: "🤝", title: "Brokerage services", text: "Work carried out by qualified, identifiable brokers — so a client can always tell a professional from a fraudster." },
  { icon: "💳", title: "Flexible payment plans", text: "Instalment arrangements that let ordinary Tanzanians purchase gradually instead of paying everything at once." },
  { icon: "🛡️", title: "Title & due diligence", text: "Ownership documents, contract terms, project location and payment terms explained clearly before you commit." },
];

export const PROCESS = [
  { title: "Browse the collection", text: "Explore available projects and properties, with photos, specifications and full pricing stated openly." },
  { title: "Choose and enquire", text: "Send an enquiry from any property page. Tell us your budget and your preferred payment arrangement." },
  { title: "Book a viewing", text: "Visit the site or the sales office. See the actual development, not just a photograph of it." },
  { title: "Verify and purchase", text: "Review the title documents and written sale agreement with an independent legal adviser before payment." },
  { title: "Handover and ownership", text: "Complete the handover, receive your title, and begin instalments if that is the arrangement you chose." },
];


/* ---- SAMPLE PROJECTS ---- */
export const PROJECTS = [
  { slug: "sample-riverside-estate", name: "Riverside Estate", location: "Dar es Salaam", summary: "A sample master-planned residential development shown to demonstrate the project layout.", status: "Selling now", sample: true },
  { slug: "sample-hillside-residences", name: "Hillside Residences", location: "Arusha", summary: "A sample hillside residential project used for layout demonstration only.", status: "Selling now", sample: true },
  { slug: "sample-mbeach-gardens", name: "Mbeach Gardens", location: "Nyerere Road, Dar es Salaam", summary: "A sample urban garden development used for layout demonstration only.", status: "Phase 2", sample: true },
];

/* ---- SAMPLE PROPERTIES ---- */
export const PROPERTIES = [
  {
    slug: "sample-villa-12", project: "sample-riverside-estate", name: "Villa 12 · 3 Bedroom", type: "Villa",
    status: "Available", price: 185000000, location: "Riverside Estate, Dar es Salaam",
    beds: 3, baths: 2, area: 240, sample: true,
    blurb: "A sample three-bedroom villa record used to demonstrate the property detail layout.",
    features: ["Private garden", "Off-street parking", "Fitted kitchen", "Water and power backup"],
  },
  {
    slug: "sample-apartment-7", project: "sample-hillside-residences", name: "Apartment 7 · 2 Bedroom", type: "Apartment",
    status: "Available", price: 95000000, location: "Hillside Residences, Arusha",
    beds: 2, baths: 2, area: 110, sample: true,
    blurb: "A sample two-bedroom apartment record used to demonstrate the property detail layout.",
    features: ["Secure building", "Balcony", "Shared water", "Resident parking"],
  },
  {
    slug: "sample-plot-21", project: "sample-mbeach-gardens", name: "Plot 21 · Residential Land", type: "Land",
    status: "Available", price: 42000000, location: "Mbeach Gardens, Nyerere Road",
    beds: 0, baths: 0, area: 600, sample: true,
    blurb: "A sample serviced-plot record used to demonstrate the land listing layout.",
    features: ["Title available", "Serviced road access", "Utilities nearby", "Corner plot"],
  },
];

export const PROPERTY_TYPES = ["All types", "Villa", "Apartment", "Land", "House", "Penthouse", "Commercial"];

export const FAQS = [
  { q: "Can I buy a home in instalments?", a: "Instalment payment plans are available on applicable terms, depending on the project. The specific arrangement is agreed in writing at the point of purchase, so there is no ambiguity about what is owed and when." },
  { q: "What should I check before paying for a property?", a: "Ownership documents, the sale contract, the project location, payment terms and any associated costs. Independent experts advise checking these with your own legal adviser before committing." },
  { q: "Do you work with Tanzanians living abroad?", a: "Yes. The Miliki Ardhi Diaspora programme exists specifically to help Tanzanians in the diaspora start owning property in Tanzania while still overseas." },
  { q: "How do I know a broker is genuine?", a: "Ask for official identification. A professional broker should be identifiable and willing to explain the property accurately, including its drawbacks." },
];

/* ---- Helpers ---- */
export function formatTZS(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "Price on request";
  if (n >= 1_000_000_000) return `TZS ${(n / 1_000_000_000).toFixed(2)} bn`;
  if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)} m`;
  return `TZS ${n.toLocaleString("en-TZ")}`;
}

export const projectBySlug = (slug) => PROJECTS.find((p) => p.slug === slug) || null;
export const propertyBySlug = (slug) => PROPERTIES.find((p) => p.slug === slug) || null;
export const propertiesForProject = (slug) => PROPERTIES.filter((p) => p.project === slug);
