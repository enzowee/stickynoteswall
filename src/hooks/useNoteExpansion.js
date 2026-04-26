import { useCallback, useEffect, useMemo, useState } from 'react';

export function useNoteExpansion() {
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const openNote = useCallback((noteId) => {
    setExpandedNoteId(noteId);
    setIsClosing(false);
    setSwipeOffset(0);
  }, []);

  const requestClose = useCallback(() => {
    if (!expandedNoteId || isClosing) {
      return;
    }
    setIsClosing(true);
  }, [expandedNoteId, isClosing]);

  const forceClose = useCallback(() => {
    setIsClosing(false);
    setExpandedNoteId(null);
    setSwipeOffset(0);
  }, []);

  const handleAnimationEnd = useCallback(() => {
    if (isClosing) {
      forceClose();
    }
  }, [forceClose, isClosing]);

  useEffect(() => {
    if (!expandedNoteId) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        requestClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [expandedNoteId, requestClose]);

  const isOpen = useMemo(() => Boolean(expandedNoteId), [expandedNoteId]);

  return {
    expandedNoteId,
    isOpen,
    isClosing,
    swipeOffset,
    setSwipeOffset,
    openNote,
    requestClose,
    handleAnimationEnd,
    forceClose,
  };
}
