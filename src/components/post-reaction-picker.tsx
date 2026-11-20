"use client";

import { useState } from "react";
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
  onSelect,
}: {
  choice: (typeof REACTION_CHOICES)[number];
  selected: boolean;
  onSelect: () => void;
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
      onClick={onSelect}
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
  const [isOpen, setIsOpen] = useState(false);
  const selectedEmoji = REACTION_CHOICES.find((choice) => choice.value === myReaction)?.emoji ?? "👍";

  return (
    <div className="reaction-picker" aria-label="Choose how you feel about this post">
      <details className="reaction-menu" open={isOpen}>
        <summary
          aria-label="Choose a reaction"
          title="Choose a reaction"
          onClick={(event) => {
            event.preventDefault();
            setIsOpen((open) => !open);
          }}
        >
          <span aria-hidden="true">{selectedEmoji}</span>
        </summary>
        <div className="reaction-menu-panel">
          {REACTION_CHOICES.map((choice) => (
            <form action={action} key={choice.value} onSubmitCapture={() => setIsOpen(false)}>
              <input type="hidden" name="post_id" value={postId} />
              <input type="hidden" name="reaction" value={choice.value} />
              <ReactionSubmitButton
                choice={choice}
                selected={myReaction === choice.value}
                onSelect={() => setIsOpen(false)}
              />
            </form>
          ))}
        </div>
      </details>
      <span className="reaction-total">{reactionCount} reactions</span>
    </div>
  );
}
