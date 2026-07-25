// Server-side holiday helper. Currently returns a static list per year
// TODO: implement Naver Calendar fetch & caching (requires scraping or API key).
const HOLIDAYS_BY_YEAR = {
  2026: [
    "2026-01-01",
    "2026-02-18","2026-02-19","2026-02-20",
    "2026-03-01",
    "2026-05-05",
    "2026-05-15",
    "2026-06-06",
    "2026-08-15",
    "2026-09-23","2026-09-24","2026-09-25",
    "2026-10-03",
    "2026-10-09",
    "2026-12-25",
  ],
};

export function getHolidays(year = new Date().getFullYear()) {
  return HOLIDAYS_BY_YEAR[year] || [];
}

export default { getHolidays };
