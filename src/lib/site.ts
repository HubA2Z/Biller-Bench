/** Public site address, used in emails, the sitemap, canonical URLs and structured data. */
export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
