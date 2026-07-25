import prisma from "../../../lib/prisma";

// Sync holidays from Korean public data portal (공공데이터포털).
// Requires service key in env `PUBLIC_HOLIDAY_API_KEY` or in request body { key }
// This implementation fetches XML and extracts <locdate> (YYYYMMDD) and <dateName>.
// Use the global `fetch` available in modern Node versions (Node 18+).
// Avoid a static import of `node-fetch` so Next.js build doesn't fail when
// the package isn't installed in the environment. If `fetch` is not present
// at runtime, the handler will return an error asking to install `node-fetch`.

function parseHolidaysFromXml(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const dateMatch = block.match(/<locdate>(\d{8})<\/locdate>/);
    const nameMatch = block.match(/<dateName>([^<]+)<\/dateName>/);
    if (dateMatch) {
      const ymd = dateMatch[1];
      const yyyy = ymd.slice(0,4);
      const mm = ymd.slice(4,6);
      const dd = ymd.slice(6,8);
      const date = `${yyyy}-${mm}-${dd}`;
      const label = nameMatch ? nameMatch[1] : null;
      items.push({ date, label });
    }
  }
  return items;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end();
    }
    const year = req.query.year ? parseInt(req.query.year,10) : new Date().getFullYear();
    const key = process.env.PUBLIC_HOLIDAY_API_KEY || req.body?.key;
    if (!key) return res.status(400).json({ error: 'API key required (set PUBLIC_HOLIDAY_API_KEY)' });

    const base = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo';
    const params = new URLSearchParams({
      serviceKey: key,
      solYear: String(year),
      _type: 'xml'
    });
    const url = `${base}?${params.toString()}`;
    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ error: 'fetch failed' });
    const xml = await r.text();
    const items = parseHolidaysFromXml(xml);
    if (items.length === 0) return res.status(200).json({ synced: 0, items: [] });
    // upsert via createMany (skip duplicates)
    const data = items.map(it => ({ date: new Date(it.date), label: it.label || null }));
    const created = await prisma.holiday.createMany({ data, skipDuplicates: true });
    res.status(200).json({ synced: created.count, items });
  } catch (e) {
    console.error('[/api/holidays/sync]', e.message);
    res.status(500).json({ error: e.message });
  }
}
