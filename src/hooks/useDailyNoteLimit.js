import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTodayKey } from '../storage';

function msUntilNextMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(next.getTime() - now.getTime(), 1000);
}

function sanitizeIncomingCounter(counter) {
  const today = getTodayKey();
  const lastDate = typeof counter?.lastDate === 'string' ? counter.lastDate : today;
  const count = Number.isInteger(counter?.count) && counter.count >= 0 ? counter.count : 0;

  if (lastDate !== today) {
    return { lastDate: today, count: 0 };
  }

  return { lastDate, count };
}

export function useDailyNoteLimit(initialCounter, maxPerDay = 5, onCounterChange) {
  const [counter, setCounter] = useState(() => sanitizeIncomingCounter(initialCounter));

  const syncToToday = useCallback(() => {
    setCounter((previous) => {
      const today = getTodayKey();
      if (previous.lastDate === today) {
        return previous;
      }
      return { lastDate: today, count: 0 };
    });
  }, []);

  useEffect(() => {
    setCounter(sanitizeIncomingCounter(initialCounter));
  }, [initialCounter?.lastDate, initialCounter?.count]);

  useEffect(() => {
    onCounterChange?.(counter);
  }, [counter, onCounterChange]);

  useEffect(() => {
    syncToToday();
    const timer = window.setTimeout(() => {
      syncToToday();
    }, msUntilNextMidnight() + 50);

    return () => {
      window.clearTimeout(timer);
    };
  }, [counter.lastDate, syncToToday]);

  const registerNewNote = useCallback(() => {
    const today = getTodayKey();
    const fresh = counter.lastDate === today ? counter : { lastDate: today, count: 0 };

    if (fresh.count >= maxPerDay) {
      if (fresh !== counter) {
        setCounter(fresh);
      }
      return false;
    }

    setCounter({ ...fresh, count: fresh.count + 1 });
    return true;
  }, [counter, maxPerDay]);

  const rollbackNewNote = useCallback(() => {
    const today = getTodayKey();
    const fresh = counter.lastDate === today ? counter : { lastDate: today, count: 0 };
    if (fresh.count <= 0) {
      return;
    }
    setCounter({ ...fresh, count: fresh.count - 1 });
  }, [counter]);

  const remaining = useMemo(() => Math.max(maxPerDay - counter.count, 0), [counter.count, maxPerDay]);

  return {
    maxPerDay,
    used: counter.count,
    remaining,
    canCreate: remaining > 0,
    registerNewNote,
    rollbackNewNote,
    counter,
  };
}
