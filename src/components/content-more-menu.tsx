import type { ReactNode } from "react";

type ServerAction = (formData: FormData) => void | Promise<void>;
type EditOption = {
  action: ServerAction;
  value: string;
  label?: string;
  fieldName?: string;
  maxLength?: number;
  rows?: number;
};
type PhotoOption = { action: ServerAction; label?: string };
type Props = {
  fields: Record<string, string>;
  edit?: EditOption;
  replacePhoto?: PhotoOption;
  removePhoto?: PhotoOption;
  deleteAction?: ServerAction;
  deleteLabel?: string;
  children?: ReactNode;
};

function HiddenFields({ fields }: { fields: Record<string, string> }) {
  return <>{Object.entries(fields).map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} />
  ))}</>;
}

export function ContentMoreMenu({
  fields,
  edit,
  replacePhoto,
  removePhoto,
  deleteAction,
  deleteLabel = "Delete",
  children,
}: Props) {
  if (!edit && !replacePhoto && !removePhoto && !deleteAction && !children) return null;

  return (
    <details className="content-more-menu">
      <summary aria-label="More content actions" title="More actions">More <span aria-hidden="true">⋯</span></summary>
      <div className="content-more-panel">
        {edit && (
          <details className="content-more-submenu">
            <summary>{edit.label ?? "Edit"}</summary>
            <form action={edit.action} className="content-menu-form">
              <HiddenFields fields={fields} />
              <label>
                <span className="sr-only">{edit.label ?? "Edit content"}</span>
                <textarea name={edit.fieldName ?? "body"} defaultValue={edit.value} maxLength={edit.maxLength ?? 3000} rows={edit.rows ?? 4} required />
              </label>
              <button className="btn btn-primary" type="submit">Save changes</button>
            </form>
          </details>
        )}
        {replacePhoto && (
          <form action={replacePhoto.action} className="content-menu-form" encType="multipart/form-data">
            <HiddenFields fields={fields} />
            <label className="content-menu-file">{replacePhoto.label ?? "Replace photo"}<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required /></label>
            <button className="text-action" type="submit">Upload replacement</button>
          </form>
        )}
        {removePhoto && (
          <details className="content-more-submenu">
            <summary>{removePhoto.label ?? "Remove photo"}</summary>
            <form action={removePhoto.action} className="content-menu-form">
              <HiddenFields fields={fields} />
              <p>This removes the photo but keeps the text and conversations.</p>
              <button className="text-action danger-action" type="submit">Confirm removal</button>
            </form>
          </details>
        )}
        {deleteAction && (
          <details className="content-more-submenu">
            <summary>{deleteLabel}</summary>
            <form action={deleteAction} className="content-menu-form">
              <HiddenFields fields={fields} />
              <p>This permanently deletes this item from TIZIBANE.</p>
              <button className="text-action danger-action" type="submit">Confirm delete</button>
            </form>
          </details>
        )}
        {children}
      </div>
    </details>
  );
}
