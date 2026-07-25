function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getSolarDateString(year, lunarMonth, lunarDay) {
  try {
    const mod = await import("korean-lunar-calendar");
    const KoreanLunarCalendar = mod.default || mod;
    const calendar = new KoreanLunarCalendar();
    calendar.setLunarDate(year, lunarMonth, lunarDay, false);
    const sYear = calendar.getSolarYear();
    const sMonth = String(calendar.getSolarMonth()).padStart(2, "0");
    const sDay = String(calendar.getSolarDay()).padStart(2, "0");
    return `${sYear}-${sMonth}-${sDay}`;
  } catch (e) {
    const fallbackDates = {
      2024: { 1: { 1: "2024-02-10" }, 4: { 8: "2024-05-15" }, 8: { 15: "2024-09-17" } },
      2025: { 1: { 1: "2025-01-29" }, 4: { 8: "2025-05-05" }, 8: { 15: "2025-10-06" } },
      2026: { 1: { 1: "2026-02-17" }, 4: { 8: "2026-05-26" }, 8: { 15: "2026-10-05" } },
      2027: { 1: { 1: "2027-02-07" }, 4: { 8: "2027-05-16" }, 8: { 15: "2027-10-04" } },
      2028: { 1: { 1: "2028-02-10" }, 4: { 8: "2028-05-26" }, 8: { 15: "2028-09-30" } },
      2029: { 1: { 1: "2029-02-19" }, 4: { 8: "2029-05-12" }, 8: { 15: "2029-09-16" } },
      2030: { 1: { 1: "2030-02-06" }, 4: { 8: "2030-05-05" }, 8: { 15: "2030-10-06" } },
    };
    return fallbackDates[year]?.[lunarMonth]?.[lunarDay] || null;
  }
}

export async function getPublicHolidays(year) {
  const holidays = {};

  const fixedHolidays = {
    [`${year}-01-01`]: "신정",
    [`${year}-03-01`]: "삼일절",
    [`${year}-05-05`]: "어린이날",
    [`${year}-06-06`]: "현충일",
    [`${year}-08-15`]: "광복절",
    [`${year}-10-03`]: "개천절",
    [`${year}-10-09`]: "한글날",
    [`${year}-10-02`]: "제헌절",
    [`${year}-12-25`]: "성탄절",
  };

  Object.assign(holidays, fixedHolidays);

  const seollal1st = await getSolarDateString(year, 1, 1);
  if (seollal1st) {
    const dateObj = new Date(`${seollal1st}T00:00:00`);
    const prevDay = new Date(dateObj);
    prevDay.setDate(dateObj.getDate() - 1);
    const nextDay = new Date(dateObj);
    nextDay.setDate(dateObj.getDate() + 1);

    holidays[formatDate(prevDay)] = "설날 연휴";
    holidays[seollal1st] = "설날";
    holidays[formatDate(nextDay)] = "설날 연휴";
  }

  const buddhaDay = await getSolarDateString(year, 4, 8);
  if (buddhaDay) {
    holidays[buddhaDay] = "부처님오신날";
  }

  const chuseok1st = await getSolarDateString(year, 8, 15);
  if (chuseok1st) {
    const dateObj = new Date(`${chuseok1st}T00:00:00`);
    const prevDay = new Date(dateObj);
    prevDay.setDate(dateObj.getDate() - 1);
    const nextDay = new Date(dateObj);
    nextDay.setDate(dateObj.getDate() + 1);

    holidays[formatDate(prevDay)] = "추석 연휴";
    holidays[chuseok1st] = "추석";
    holidays[formatDate(nextDay)] = "추석 연휴";
  }

  const substituteHolidayNames = new Set(["신정", "삼일절", "어린이날", "현충일", "광복절", "개천절", "한글날", "제헌절", "성탄절", "설날", "설날 연휴", "부처님오신날", "추석", "추석 연휴"]);
  const additionalHolidays = {};

  for (const [dateStr, name] of Object.entries(holidays)) {
    if (!substituteHolidayNames.has(name)) continue;

    const d = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = d.getDay();

    if (dayOfWeek === 0) {
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);
      const nextDayStr = formatDate(nextDay);
      if (!holidays[nextDayStr]) {
        additionalHolidays[nextDayStr] = `${name} 대체공휴일`;
      }
    }
  }

  Object.assign(holidays, additionalHolidays);
  return holidays;
}

export async function getHolidays(year = new Date().getFullYear()) {
  const publicHolidays = await getPublicHolidays(year);
  return Object.entries(publicHolidays).map(([date, label]) => ({ date, label }));
}

export default { getHolidays, getPublicHolidays };
