export const DOC_TYPES = [
  "Passport",
  "Passport photo",
  "Degree certificate",
  "Teaching qualification (QTS/PGCE)",
  "Emirates ID",
  "Reference letter",
  "Attested documents",
  "Other",
];

export const slugify = (s) =>
  String(s || "doc").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
