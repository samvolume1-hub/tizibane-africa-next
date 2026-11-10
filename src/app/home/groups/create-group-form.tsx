"use client";

import { useState } from "react";
import { CompressedImageForm } from "@/components/compressed-image-form";
import { PendingIconButton } from "@/components/pending-icon-button";
import styles from "./create-group-form.module.css";

type Props = { action: (formData: FormData) => void | Promise<void> };

export function CreateGroupForm({ action }: Props) {
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  return (
    <section className={styles.shell} aria-labelledby="create-group-title">
      <div className={styles.heading}>
        <div className={styles.headingIcon} aria-hidden="true">✦</div>
        <div className={styles.headingCopy}>
          <h2 id="create-group-title">Create Your Group</h2>
          <p>Bring people together around something you love. Your circle starts here.</p>
        </div>
      </div>

      <CompressedImageForm action={action} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="group-name">What should we call your group?</label>
          <input className={styles.input} id="group-name" name="name" minLength={2} maxLength={80} required placeholder="Give your group a name…" />
          <span className={styles.hint}>Choose a name people will remember. You can change it later in Group settings.</span>
        </div>

        <div className={styles.accessBlock}>
          <p className={styles.accessTitle} id="group-access-title">Who can be part of your group?</p>
          <div className={styles.choiceGrid} role="radiogroup" aria-labelledby="group-access-title">
            <label className={`${styles.choice} ${visibility === "public" ? styles.choiceSelected : ""}`}>
              <input className={styles.radio} type="radio" name="visibility" value="public" checked={visibility === "public"} onChange={() => setVisibility("public")} />
              <span className={styles.choiceIcon} aria-hidden="true">🌍</span>
              <span className={styles.choiceCopy}>
                <strong>Public group</strong>
                <span>Anyone can discover your group and join the conversation.</span>
              </span>
              {visibility === "public" && <span className={styles.choiceCheck} aria-hidden="true">✓</span>}
            </label>
            <label className={`${styles.choice} ${visibility === "private" ? styles.choiceSelected : ""}`}>
              <input className={styles.radio} type="radio" name="visibility" value="private" checked={visibility === "private"} onChange={() => setVisibility("private")} />
              <span className={styles.choiceIcon} aria-hidden="true">🔒</span>
              <span className={styles.choiceCopy}>
                <strong>Private group</strong>
                <span>Create a more personal space. People request access before joining.</span>
              </span>
              {visibility === "private" && <span className={styles.choiceCheck} aria-hidden="true">✓</span>}
            </label>
          </div>
          <input type="hidden" name="join_policy" value={visibility === "public" ? "open" : "approval"} />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="group-description">Tell people what brings you together</label>
          <textarea className={styles.textarea} id="group-description" name="description" maxLength={500} rows={4} placeholder="Share what this group is about, who it is for, and what members can enjoy together…" />
          <span className={styles.hint}>A friendly description helps the right people find their circle.</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="group-category">Choose a category</label>
          <input className={styles.input} id="group-category" name="category" maxLength={60} defaultValue="Community" placeholder="e.g. Business, Music, Sports, Family…" />
        </div>

        <div className={styles.coverBox}>
          <div className={styles.coverHeader}><span className={styles.coverIcon} aria-hidden="true">▧</span><span>Give your group a face</span></div>
          <span className={styles.hint}>Add a cover photo that captures your group’s personality. JPG, PNG or WebP · optimized toward 1 MB · maximum 2 MB.</span>
          <input className={styles.fileInput} id="group-cover-photo" name="cover_photo" type="file" accept="image/jpeg,image/png,image/webp" />
        </div>

        <details className={styles.details}>
          <summary>Add optional group rules</summary>
          <div className={`${styles.field} ${styles.rules}`}>
            <label className={styles.label} htmlFor="group-rules">What should members know?</label>
            <textarea className={styles.textarea} id="group-rules" name="rules" maxLength={1500} rows={3} placeholder="Set a few friendly expectations for your group…" />
          </div>
        </details>

        <PendingIconButton className={`btn btn-primary ${styles.submit}`} label="Create your group" pendingLabel="Creating your group…">＋ Create Group</PendingIconButton>
        <p className={styles.footerHint}>You’ll be the group owner. You can manage members and settings after creation.</p>
      </CompressedImageForm>
    </section>
  );
}
