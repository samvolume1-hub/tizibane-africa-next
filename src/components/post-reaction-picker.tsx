"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

const REACTION_CHOICES = [
  { value: "like", emoji: "👍", label: "Like" },
  { value: "love", emoji: "❤️", label: "Love" },
  { value: "laugh", emoji: "😂", label: "Joy" },
  { value: "wow", emoji: "😮", label: "Wow" },
  { value: "sad", emoji: "😢", label: "Sad" },
  { value: "celebrate", emoji: "🎉", label: "Celebrate" },
  { value: "support", emoji: "🤗", label: "Support" },
  { value: "salute", emoji: "🫡", label: "Salute" },
  { value: "pray", emoji: "🙏", label: "Pray" },
] as const;

function ReactionSubmitButton({
  choice,
  selected,
  closeMenu,
}: {
  choice: (typeof REACTION_CHOICES)[number];
  selected: boolean;
  closeMenu: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`reaction-choice${selected ? " is-selected" : ""}`}
      type="submit"
      disabled={pending}
      aria-label={choice.label}
      title={choice.label}
      aria-pressed={selected}
      aria-busy={pending}
      onClick={closeMenu}
    >
      <span className="reaction-emoji" aria-hidden="true">{choice.emoji}</span>
    </button>
  );
}

export function PostReactionPicker({
  postId,
  myReaction,
  reactionCount,
  action,
}: {
  postId: string;
  myReaction?: string;
  reactionCount: number;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const selectedEmoji = REACTION_CHOICES.find((choice) => choice.value === myReaction)?.emoji ?? "👍";
  const closeMenu = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  return (
    <div className="reaction-picker" aria-label="Choose how you feel about this post">
      <details className="reaction-menu" ref={detailsRef}>
        <summary aria-label="Choose a reaction" title="Choose a reaction">
          <span aria-hidden="true">{selectedEmoji}</span>
        </summary>
        <div className="reaction-menu-panel">
          {REACTION_CHOICES.map((choice) => (
            <form action={action} key={choice.value}>
              <input type="hidden" name="post_id" value={postId} />
              <input type="hidden" name="reaction" value={choice.value} />
              <ReactionSubmitButton
                choice={choice}
                selected={myReaction === choice.value}
                closeMenu={closeMenu}
              />
            </form>
          ))}
        </div>
      </details>
      <span className="reaction-total">{reactionCount} reactions</span>
    </div>
  );
}
