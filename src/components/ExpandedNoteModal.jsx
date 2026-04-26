import { useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ExpandedNoteModal({
  note,
  authorDisplay,
  isClosing,
  swipeOffset,
  setSwipeOffset,
  onRequestClose,
  onAnimationEnd,
}) {
  const touchStartY = useRef(0);

  const handleTouchStart = (event) => {
    touchStartY.current = event.touches[0].clientY;
  };

  const handleTouchMove = (event) => {
    const diff = event.touches[0].clientY - touchStartY.current;
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 130));
      if (diff > 10) {
        event.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 50) {
      onRequestClose();
    } else {
      setSwipeOffset(0);
    }
  };

  const portalTarget = document.getElementById('modal-root') || document.body;

  return createPortal(
    <div
      className={`expanded-overlay ${isClosing ? 'overlay-exit' : 'overlay-enter'}`}
      onClick={onRequestClose}
      role="presentation"
    >
      <article
        className={`expanded-note ${isClosing ? 'exit-animation' : 'enter-animation'}`}
        style={{
          backgroundColor: note.color,
          translate: `0 ${swipeOffset}px`,
        }}
        onClick={(event) => event.stopPropagation()}
        onAnimationEnd={onAnimationEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="expanded-textarea" aria-label="Note content" role="document">
          {note.content || 'No content in this note yet.'}
        </div>

        <p className="note-signature">{authorDisplay ? `- ${authorDisplay}` : ''}</p>
      </article>
    </div>,
    portalTarget
  );
}
