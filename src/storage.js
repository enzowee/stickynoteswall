const STORAGE_KEY = 'stickyNotesAppDataV1';

const DEFAULT_DATA = {
  nickname: '',
  dailyCounter: {
    lastDate: '',
    count: 0,
  },
  nicknameCounter: {
    lastDate: '',
    count: 0,
  },
};

function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function isValidDateString(value) {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sanitizeCounter(counter) {
  const today = getTodayKey();
  const lastDate = typeof counter?.lastDate === 'string' ? counter.lastDate : today;
  const count = Number.isInteger(counter?.count) && counter.count >= 0 ? counter.count : 0;

  if (lastDate !== today) {
    return { lastDate: today, count: 0 };
  }

  return { lastDate, count };
}

export function loadAppData() {
  if (typeof window === 'undefined') {
    return DEFAULT_DATA;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_DATA, dailyCounter: sanitizeCounter(DEFAULT_DATA.dailyCounter) };
    }

    const parsed = JSON.parse(raw);
    const sanitized = {
      nickname: typeof parsed?.nickname === 'string' ? parsed.nickname.slice(0, 32) : '',
      dailyCounter: sanitizeCounter(parsed?.dailyCounter),
      nicknameCounter: sanitizeCounter(parsed?.nicknameCounter),
    };

    return sanitized;
  } catch (error) {
    return { ...DEFAULT_DATA, dailyCounter: sanitizeCounter(DEFAULT_DATA.dailyCounter) };
  }
}

export function saveAppData(data) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    // Ignore write failures such as quota exceeded or private mode restrictions.
  }
}

export function buildDefaultData() {
  return {
    ...DEFAULT_DATA,
    dailyCounter: sanitizeCounter(DEFAULT_DATA.dailyCounter),
    nicknameCounter: sanitizeCounter(DEFAULT_DATA.nicknameCounter),
  };
}

export { STORAGE_KEY, getTodayKey };
