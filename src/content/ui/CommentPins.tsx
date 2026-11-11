import { useState } from "react";
import { MessageSquare, Trash2, X } from "lucide-react";
import type { DesignComment } from "../../shared/types";

interface CommentPinsProps {
  comments: DesignComment[];
  visible: boolean;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
}

export function CommentPins({
  comments,
  visible,
  activeId,
  onSelect,
  onDelete,
}: CommentPinsProps) {
  if (!visible || comments.length === 0) return null;

  return (
    <div className="comment-layer" aria-label="Design comments">
      {comments.map((comment, index) => {
        const left = comment.pageX - window.scrollX;
        const top = comment.pageY - window.scrollY;
        const open = activeId === comment.id;

        return (
          <div
            key={comment.id}
            className={`comment-pin${open ? " open" : ""}`}
            style={{ left, top }}
          >
            <button
              type="button"
              className="comment-pin-btn"
              title={comment.elementLabel}
              aria-label={`Comment ${index + 1}`}
              aria-expanded={open}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(open ? null : comment.id);
              }}
            >
              <MessageSquare size={12} />
              <span>{index + 1}</span>
            </button>

            {open ? (
              <div className="comment-card" role="dialog" aria-label="Comment details">
                <div className="comment-card-header">
                  <span className="comment-card-label" title={comment.elementLabel}>
                    {comment.elementLabel}
                  </span>
                  <div className="comment-card-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      title="Delete comment"
                      aria-label="Delete comment"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(comment.id);
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Close"
                      aria-label="Close comment"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(null);
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
                <p className="comment-card-note">{comment.note}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

interface CommentComposerProps {
  elementLabel: string;
  onCancel: () => void;
  onSave: (note: string) => void;
}

export function CommentComposer({ elementLabel, onCancel, onSave }: CommentComposerProps) {
  const [note, setNote] = useState("");

  return (
    <div className="comment-composer" role="dialog" aria-label="Add design comment">
      <div className="comment-composer-title">Flag issue</div>
      <div className="comment-composer-target" title={elementLabel}>
        {elementLabel}
      </div>
      <label className="comment-composer-label" htmlFor="is-comment-note">
        Why is this off?
      </label>
      <textarea
        id="is-comment-note"
        className="comment-composer-input"
        rows={4}
        placeholder="Spacing feels tight / color contrast / wrong type size…"
        value={note}
        autoFocus
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onCancel();
          }
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && note.trim()) {
            e.preventDefault();
            onSave(note.trim());
          }
        }}
      />
      <div className="btn-row">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={!note.trim()}
          onClick={() => onSave(note.trim())}
        >
          Pin comment
        </button>
      </div>
    </div>
  );
}
