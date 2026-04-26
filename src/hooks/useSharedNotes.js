import { useCallback, useEffect, useRef, useState } from 'react';
import { createNote, fetchNotes, patchNote, removeNote } from '../sharedNotesApi';

const POLL_INTERVAL_MS = 2500;

export function useSharedNotes() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const lastSyncRef = useRef(0);

  const syncNotes = useCallback(async () => {
    try {
      const next = await fetchNotes();
      setNotes(next);
      setApiError('');
      lastSyncRef.current = Date.now();
    } catch {
      setApiError('Unable to reach shared notes server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncNotes();
    const timer = window.setInterval(() => {
      syncNotes();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [syncNotes]);

  const addSharedNote = useCallback(async (payload) => {
    const created = await createNote(payload);
    setNotes((previous) => [created, ...previous]);
    return created;
  }, []);

  const updateSharedNote = useCallback(async (id, updates) => {
    const updated = await patchNote(id, updates);
    setNotes((previous) => previous.map((note) => (note.id === id ? updated : note)));
    return updated;
  }, []);

  const deleteSharedNote = useCallback(async (id) => {
    await removeNote(id);
    setNotes((previous) => previous.filter((note) => note.id !== id));
  }, []);

  return {
    notes,
    isLoading,
    apiError,
    addSharedNote,
    updateSharedNote,
    deleteSharedNote,
    syncNotes,
    lastSyncedAt: lastSyncRef.current,
  };
}
