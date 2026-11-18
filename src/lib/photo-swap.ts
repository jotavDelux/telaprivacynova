// Resolves a manually typed photo value into something the <img> can load.
//
// Empty value -> keep the photo already shipped with the site.
// Full address ("https://...", "data:...", "/...") -> used as typed.
// A bare file name ("minha-foto.jpg") -> read from the public/ folder.
export function photoSource(value: string, fallback: { url: string }): { url: string } {
  const typed = value.trim();
  if (!typed) return fallback;
  if (/^(https?:|data:|blob:|\/)/i.test(typed)) return { url: typed };
  return { url: `/${typed}` };
}
