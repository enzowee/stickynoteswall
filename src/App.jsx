import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ExpandedNoteModal from './components/ExpandedNoteModal';
import { useDailyNoteLimit } from './hooks/useDailyNoteLimit';
import { useNoteExpansion } from './hooks/useNoteExpansion';
import { useSharedNotes } from './hooks/useSharedNotes';
import { buildDefaultData, getTodayKey, loadAppData, saveAppData } from './storage';

const AppContext = createContext(null);

function getRandomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function sortNotes(notes) {
  return [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function HeaderBar() {
  const {
    onChangeNickname,
    addNote,
  } = useContext(AppContext);

  return (
    <header className="header-shell">
      <div className="app-header">
        <div className="header-controls">
          <button type="button" className="primary-button" onClick={addNote}>
            Add Note
          </button>
          <button type="button" className="secondary-button" onClick={onChangeNickname}>
            Change Nickname
          </button>
        </div>
      </div>
    </header>
  );
}

function NoteCard({ note, onOpen, authorDisplay }) {
  return (
    <article
      className="note-card"
      style={{
        backgroundColor: note.color,
      }}
      onClick={() => onOpen(note.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(note.id);
        }
      }}
    >
      <p className="note-preview">{note.content || 'Tap to open and write your note...'}</p>
      <p className="note-card-signature">{authorDisplay ? `- ${authorDisplay}` : ''}</p>
    </article>
  );
}

function NicknameGate({ onSave }) {
  const [value, setValue] = useState('');

  return (
    <div className="nickname-overlay" role="presentation">
      <div className="nickname-card" role="dialog" aria-modal="true" aria-label="Set your nickname">
        <h2>Choose your nickname</h2>
        <p>This app is fully anonymous. Your nickname stays on this device.</p>
        <input
          className="nickname-input"
          value={value}
          maxLength={32}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Your nickname"
          autoFocus
        />
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            const trimmed = value.trim();
            if (trimmed) {
              onSave(trimmed);
            }
          }}
          disabled={!value.trim()}
        >
          Start Writing
        </button>
      </div>
    </div>
  );
}

function AppBody() {
  const {
    notes,
    expansion,
    expandedNote,
    getNoteAuthorDisplay,
    isLoadingNotes,
    apiError,
  } = useContext(AppContext);

  return (
    <>
      {!expandedNote ? <HeaderBar /> : null}

      <main>
        {isLoadingNotes ? <p className="sync-status">Loading shared notes...</p> : null}
        {apiError ? <p className="sync-status error">{apiError}</p> : null}
        {notes.length === 0 ? (
          <section className="empty-state">
            <h2>No notes yet</h2>
            <p>Create your first shared sticky note and everyone connected will see it.</p>
          </section>
        ) : (
          <section className="notes-grid">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onOpen={expansion.openNote}
                authorDisplay={getNoteAuthorDisplay(note)}
              />
            ))}
          </section>
        )}
      </main>

      {expandedNote ? (
        <ExpandedNoteModal
          note={expandedNote}
          authorDisplay={getNoteAuthorDisplay(expandedNote)}
          isClosing={expansion.isClosing}
          swipeOffset={expansion.swipeOffset}
          setSwipeOffset={expansion.setSwipeOffset}
          onRequestClose={expansion.requestClose}
          onAnimationEnd={expansion.handleAnimationEnd}
        />
      ) : null}
    </>
  );
}

export default function App() {
  const [localProfile, setLocalProfile] = useState(() => {
    const loaded = loadAppData();
    return loaded ?? buildDefaultData();
  });

  const sharedNotes = useSharedNotes();
  const nicknameChangeLimit = 3;
  const [authorFallbackById, setAuthorFallbackById] = useState({});
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeDraft, setComposeDraft] = useState('');
  const [composeError, setComposeError] = useState('');
  const [isNicknameEditorOpen, setIsNicknameEditorOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [nicknameError, setNicknameError] = useState('');

  const notePalette = useMemo(() => [
    '#fff9c4', '#fff59d', '#fff176', '#ffee58', '#ffecb3', '#ffe082', '#ffd54f',
    '#f8ef9a', '#f7e27a', '#f5ecb1', '#f4e18a', '#f3efbd', '#f6efb5', '#f2e7a8',
    '#dcedc8', '#c5e1a5', '#aed581', '#e6ee9c', '#dcf8c6', '#c8f7c5', '#b9f6ca',
    '#b2dfdb', '#b2ebf2', '#b3e5fc', '#bbdefb', '#c5cae9', '#d1c4e9', '#e1bee7',
    '#f8bbd0', '#ffcdd2', '#ffccbc', '#ffe0b2', '#ffecb3', '#f0f4c3', '#e8f5e9',
    '#e0f7fa', '#e3f2fd', '#ede7f6', '#f3e5f5', '#fce4ec', '#fbe9e7', '#fff3e0',
  ], []);

  const updateDailyCounter = useCallback((counter) => {
    setLocalProfile((previous) => {
      if (
        previous.dailyCounter.lastDate === counter.lastDate
        && previous.dailyCounter.count === counter.count
      ) {
        return previous;
      }
      return {
        ...previous,
        dailyCounter: counter,
      };
    });
  }, []);

  const daily = useDailyNoteLimit(localProfile.dailyCounter, 5, updateDailyCounter);
  const expansion = useNoteExpansion();

  const notes = useMemo(() => sortNotes(sharedNotes.notes), [sharedNotes.notes]);
  const expandedNote = useMemo(
    () => sharedNotes.notes.find((note) => note.id === expansion.expandedNoteId) || null,
    [sharedNotes.notes, expansion.expandedNoteId]
  );

  useEffect(() => {
    if (!expandedNote) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [expandedNote]);

  useEffect(() => {
    saveAppData(localProfile);
  }, [localProfile]);

  useEffect(() => {
    const currentNickname = localProfile.nickname?.trim();

    setAuthorFallbackById((previous) => {
      let changed = false;
      const next = { ...previous };

      notes.forEach((note) => {
        if (note.authorNickname) {
          if (next[note.id] !== note.authorNickname) {
            next[note.id] = note.authorNickname;
            changed = true;
          }
          return;
        }

        if (!next[note.id] && currentNickname) {
          next[note.id] = currentNickname;
          changed = true;
        }
      });

      return changed ? next : previous;
    });
  }, [localProfile.nickname, notes]);

  useEffect(() => {
    if (!notes.length) {
      return;
    }

    const missingAuthorNotes = notes.filter((note) => !note.authorNickname && authorFallbackById[note.id]);
    if (!missingAuthorNotes.length) {
      return;
    }

    missingAuthorNotes.forEach((note) => {
      sharedNotes.updateSharedNote(note.id, { authorNickname: authorFallbackById[note.id] }).catch(() => {
        // Ignore transient sync failures; periodic polling will retry.
      });
    });
  }, [authorFallbackById, notes, sharedNotes]);

  const getNoteAuthorDisplay = useCallback(
    (note) => note?.authorNickname || authorFallbackById[note?.id] || '',
    [authorFallbackById]
  );

  const setNickname = useCallback((nickname) => {
    setLocalProfile((previous) => ({ ...previous, nickname: nickname.slice(0, 32) }));
  }, []);

  const onChangeNickname = useCallback(() => {
    const today = getTodayKey();
    const todaysCounter = localProfile.nicknameCounter?.lastDate === today
      ? localProfile.nicknameCounter
      : { lastDate: today, count: 0 };

    if (todaysCounter.count >= nicknameChangeLimit) {
      window.alert('You can only change nickname 3 times per day.');
      return;
    }
    setNicknameDraft(localProfile.nickname || '');
    setNicknameError('');
    setIsNicknameEditorOpen(true);
  }, [localProfile.nickname, localProfile.nicknameCounter]);

  const addNote = useCallback(() => {
    setComposeDraft('');
    setComposeError('');
    setIsComposeOpen(true);
  }, []);

  const submitNoteFromComposer = useCallback(async () => {
    const content = composeDraft.trim().slice(0, 300);
    if (!content) {
      setComposeError('Please write a note before posting.');
      return;
    }

    const now = new Date().toISOString();
    const randomColor = notePalette[Math.floor(Math.random() * notePalette.length)];
    const note = {
      id: `${Date.now()}-${getRandomId()}`,
      content,
      color: randomColor,
      authorNickname: localProfile.nickname,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const created = await sharedNotes.addSharedNote(note);
      setIsComposeOpen(false);
      setComposeDraft('');
      setComposeError('');
      expansion.openNote(created.id);
    } catch {
      setComposeError('Failed to post note. Please check server connection.');
    }
  }, [composeDraft, expansion, localProfile.nickname, notePalette, sharedNotes]);

  const submitNicknameChange = useCallback(() => {
    const trimmed = nicknameDraft.trim().slice(0, 32);
    if (!trimmed) {
      setNicknameError('Nickname cannot be empty.');
      return;
    }

    const currentToday = getTodayKey();
    const currentCounter = localProfile.nicknameCounter?.lastDate === currentToday
      ? localProfile.nicknameCounter
      : { lastDate: currentToday, count: 0 };

    if (currentCounter.count >= nicknameChangeLimit) {
      setNicknameError('You can only change nickname 3 times per day.');
      return;
    }

    setLocalProfile((previous) => ({
      ...previous,
      nickname: trimmed,
      nicknameCounter: {
        lastDate: currentToday,
        count: currentCounter.count + 1,
      },
    }));

    setIsNicknameEditorOpen(false);
    setNicknameError('');
  }, [localProfile.nicknameCounter, nicknameDraft]);

  const contextValue = useMemo(() => ({
    nickname: localProfile.nickname,
    notes,
    daily,
    addNote,
    setNickname,
    onChangeNickname,
    getNoteAuthorDisplay,
    expansion,
    expandedNote,
    isLoadingNotes: sharedNotes.isLoading,
    apiError: sharedNotes.apiError,
  }), [notes, daily, addNote, setNickname, onChangeNickname, getNoteAuthorDisplay, expansion, expandedNote, sharedNotes.isLoading, sharedNotes.apiError]);

  return (
    <AppContext.Provider value={contextValue}>
      <style>{`
        :root {
          --paper: #f2e8d5;
          --ink: #2d2620;
          --accent: #0f6d8f;
          --danger: #8f1c23;
          --warn: #a86600;
          --card-shadow: 0 9px 14px rgba(0, 0, 0, 0.2), 0 2px 3px rgba(0, 0, 0, 0.12);
          --expanded-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: 'Trebuchet MS', 'Gill Sans', 'Segoe UI', sans-serif;
          color: var(--ink);
          background-image:
            linear-gradient(rgba(53, 37, 27, 0.48), rgba(53, 37, 27, 0.48)),
            url('https://images.unsplash.com/photo-1533628635777-112b2239b1c7?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');
          background-position: center;
          background-size: cover;
          background-attachment: fixed;
          min-height: 100vh;
        }

        #root {
          min-height: 100vh;
          padding: 88px 20px 20px;
        }

        .header-shell {
          position: fixed;
          top: 14px;
          right: 14px;
          z-index: 1100;
        }

        .app-header {
          background: rgba(255, 252, 240, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 14px;
          padding: 10px;
          backdrop-filter: blur(6px);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
        }

        h1 {
          margin: 0;
          font-size: clamp(1.5rem, 2.4vw, 2.1rem);
          letter-spacing: 0.02em;
        }

        .subtitle {
          margin: 4px 0 0;
          font-size: 1rem;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-start;
          max-width: min(94vw, 560px);
        }

        .limit-pill {
          margin: 0;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.88);
          border-radius: 999px;
          border: 1px solid rgba(23, 104, 172, 0.25);
          font-size: 0.92rem;
        }

        button,
        input,
        textarea {
          font-family: inherit;
          font-size: 16px;
          -webkit-appearance: none;
        }

        button {
          min-width: 44px;
          min-height: 44px;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }

        button:hover {
          transform: translateY(-1px);
        }

        button:active {
          transform: scale(0.98);
          opacity: 0.9;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          transform: none;
        }

        .primary-button {
          background: var(--accent);
          color: #fff;
        }

        .secondary-button {
          background: #fff;
          color: var(--ink);
          border-color: rgba(47, 41, 33, 0.2);
        }

        .danger-button {
          background: var(--danger);
          color: #fff;
        }

        .icon-button {
          background: rgba(255, 255, 255, 0.75);
          color: #2f2921;
          border: 1px solid rgba(0, 0, 0, 0.15);
          min-width: 44px;
          min-height: 44px;
        }

        .color-input {
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          border: 1px solid rgba(0, 0, 0, 0.18);
          border-radius: 10px;
          padding: 4px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.9);
        }

        .notes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 24px;
          align-items: start;
        }

        .note-card {
          padding: 26px 18px 18px;
          min-height: 250px;
          aspect-ratio: 1 / 1;
          border-radius: 2px;
          background-image: linear-gradient(to bottom, rgba(235, 231, 177, 0.9) 0%, rgba(255, 255, 240, 0.3) 18%, transparent 40%);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);
          border: 1px solid rgba(145, 137, 88, 0.22);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
          position: relative;
          outline: none;
        }

        .note-card::before {
          content: '';
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          left: calc(50% - 7px);
          top: -9px;
          background: radial-gradient(circle at 32% 30%, #fff7f9 0%, #e95d82 52%, #b73a5d 100%);
          box-shadow: 0 3px 5px rgba(0, 0, 0, 0.36);
        }

        .note-card::after {
          content: '';
          position: absolute;
          right: -1px;
          top: 0;
          border-width: 0 15px 15px 0;
          border-style: solid;
          border-color: transparent rgba(210, 204, 150, 0.72) transparent transparent;
          border-top-right-radius: 4px;
        }

        .note-card:hover {
          transform: scale(1.01);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.18);
        }

        .note-card:focus-visible {
          box-shadow: 0 0 0 3px rgba(23, 104, 172, 0.35), var(--card-shadow);
        }

        .note-preview {
          margin: 0;
          min-height: 100%;
          padding-bottom: 22px;
          line-height: 1.5;
          white-space: pre-wrap;
          overflow: hidden;
          word-break: break-word;
        }

        .note-card-signature {
          margin: 0;
          position: absolute;
          left: 18px;
          bottom: 12px;
          font-size: 0.88rem;
          font-weight: 600;
          opacity: 0.82;
        }

        .empty-state {
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.76);
          border: 1px dashed rgba(47, 41, 33, 0.28);
          padding: 28px;
          text-align: center;
          backdrop-filter: blur(6px);
        }

        .sync-status {
          margin: 0 0 12px;
          font-weight: 600;
          color: #1c3d5a;
        }

        .sync-status.error {
          color: var(--danger);
        }

        .expanded-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(18, 16, 12, 0.55);
          backdrop-filter: blur(8px);
          padding: 20px;
          overflow: hidden;
          touch-action: none;
        }

        .expanded-note {
          width: min(95vw, 860px);
          min-height: min(82vh, 760px);
          max-height: min(82vh, 760px);
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.15);
          box-shadow: var(--expanded-shadow);
          padding: 20px;
          will-change: transform, opacity;
          touch-action: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .expanded-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .expanded-title {
          font-size: 1.1rem;
        }

        .expanded-textarea {
          width: 100%;
          flex: 1;
          min-height: 0;
          border: none;
          background: transparent;
          padding: 0;
          line-height: 1.5;
          font-size: 1.05rem;
          white-space: pre-wrap;
          overflow: hidden;
          word-break: break-word;
        }

        .note-signature {
          margin: 0;
          align-self: flex-start;
          font-size: 0.95rem;
          font-weight: 600;
          opacity: 0.85;
        }

        .action-overlay {
          position: fixed;
          inset: 0;
          z-index: 1150;
          display: grid;
          place-items: center;
          padding: 16px;
          background: rgba(20, 18, 12, 0.58);
          backdrop-filter: blur(6px);
        }

        .action-card {
          width: min(94vw, 520px);
          border-radius: 16px;
          padding: 18px;
          border: 1px solid rgba(255, 255, 255, 0.45);
          background: rgba(255, 252, 240, 0.94);
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.26);
        }

        .action-title {
          margin: 0 0 10px;
          font-size: 1.2rem;
        }

        .action-textarea {
          width: 100%;
          min-height: 170px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.18);
          padding: 12px;
          resize: vertical;
          background: rgba(255, 255, 255, 0.78);
        }

        .action-counter {
          margin: 8px 0 0;
          font-size: 0.84rem;
          opacity: 0.78;
        }

        .action-error {
          margin: 8px 0 0;
          color: var(--danger);
          font-size: 0.9rem;
          font-weight: 600;
        }

        .action-row {
          margin-top: 12px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .nickname-overlay {
          position: fixed;
          inset: 0;
          z-index: 1100;
          display: grid;
          place-items: center;
          background: rgba(20, 18, 12, 0.6);
          backdrop-filter: blur(8px);
          padding: 16px;
        }

        .nickname-card {
          width: min(94vw, 420px);
          background: #fff;
          color: var(--ink);
          border-radius: 16px;
          padding: 20px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.22);
        }

        .nickname-card h2 {
          margin: 0 0 6px;
        }

        .nickname-card p {
          margin: 0 0 12px;
        }

        .nickname-input {
          width: 100%;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          min-height: 44px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .overlay-enter {
          animation: overlayIn 0.3s ease forwards;
        }

        .overlay-exit {
          animation: overlayOut 0.25s ease-out forwards;
        }

        .enter-animation {
          animation: zoomIn 0.3s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
        }

        .exit-animation {
          animation: zoomOut 0.25s ease-out forwards;
        }

        @keyframes overlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes overlayOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes zoomIn {
          from {
            opacity: 0;
            transform: translateY(26px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes zoomOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(28px) scale(0.97);
          }
        }

        @media (max-width: 900px) {
          body {
            background-attachment: scroll;
          }

          #root {
            padding: 92px 14px 14px;
          }

          .app-header {
            width: min(92vw, 420px);
          }

          .header-controls {
            justify-content: flex-start;
          }

          .expanded-note {
            width: 94vw;
            min-height: 80vh;
            max-height: 80vh;
          }
        }
      `}</style>

      <AppBody />

      {isComposeOpen ? (
        <div className="action-overlay" role="presentation" onClick={() => setIsComposeOpen(false)}>
          <section className="action-card" role="dialog" aria-modal="true" aria-label="Post a new note" onClick={(event) => event.stopPropagation()}>
            <h3 className="action-title">Post New Note</h3>
            <textarea
              className="action-textarea"
              value={composeDraft}
              maxLength={300}
              placeholder="Write your note..."
              onChange={(event) => {
                setComposeDraft(event.target.value);
                if (composeError) {
                  setComposeError('');
                }
              }}
              autoFocus
            />
            <p className="action-counter">{composeDraft.length}/300</p>
            {composeError ? <p className="action-error">{composeError}</p> : null}
            <div className="action-row">
              <button type="button" className="secondary-button" onClick={() => setIsComposeOpen(false)}>Cancel</button>
              <button type="button" className="primary-button" onClick={submitNoteFromComposer}>Post</button>
            </div>
          </section>
        </div>
      ) : null}

      {isNicknameEditorOpen ? (
        <div className="action-overlay" role="presentation" onClick={() => setIsNicknameEditorOpen(false)}>
          <section className="action-card" role="dialog" aria-modal="true" aria-label="Change nickname" onClick={(event) => event.stopPropagation()}>
            <h3 className="action-title">Change Nickname</h3>
            <input
              className="nickname-input"
              value={nicknameDraft}
              maxLength={32}
              placeholder="Your nickname"
              onChange={(event) => {
                setNicknameDraft(event.target.value);
                if (nicknameError) {
                  setNicknameError('');
                }
              }}
              autoFocus
            />
            {nicknameError ? <p className="action-error">{nicknameError}</p> : null}
            <div className="action-row">
              <button type="button" className="secondary-button" onClick={() => setIsNicknameEditorOpen(false)}>Cancel</button>
              <button type="button" className="primary-button" onClick={submitNicknameChange}>Save</button>
            </div>
          </section>
        </div>
      ) : null}

      {!localProfile.nickname ? <NicknameGate onSave={setNickname} /> : null}
    </AppContext.Provider>
  );
}
