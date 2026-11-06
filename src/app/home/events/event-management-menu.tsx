"use client";

import { useEffect, useState } from "react";
import { deleteEvent, updateEvent } from "../event-actions";

type Props = {
  event: {
    id: string;
    name: string;
    description: string;
    category: string;
    location: string;
    startsAt: string;
    endsAt: string;
    isPublic: boolean;
  };
};

function localDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function EventManagementMenu({ event }: Props) {
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [offset, setOffset] = useState("0");

  useEffect(() => {
    setStartsAt(localDateTime(event.startsAt));
    setEndsAt(localDateTime(event.endsAt));
    setOffset(String(new Date().getTimezoneOffset()));
  }, [event.startsAt, event.endsAt]);

  return (
    <details className="content-more-menu event-more-menu">
      <summary aria-label="More event actions">More <span aria-hidden="true">⋯</span></summary>
      <div className="content-more-panel">
        <details className="content-more-submenu">
          <summary>Edit event</summary>
          <form action={updateEvent} className="content-menu-form event-edit-form">
            <input type="hidden" name="event_id" value={event.id}/>
            <input type="hidden" name="timezone_offset" value={offset}/>
            <label>Event name<input name="name" defaultValue={event.name} required minLength={2} maxLength={100}/></label>
            <label>Description<textarea name="description" defaultValue={event.description} rows={3} maxLength={2000}/></label>
            <label>Category<input name="category" defaultValue={event.category} maxLength={60}/></label>
            <label>Location<input name="location" defaultValue={event.location} maxLength={160}/></label>
            <label>Starts<input name="starts_at" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required/></label>
            <label>Ends<input name="ends_at" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required/></label>
            <label>Visibility<select name="is_public" defaultValue={event.isPublic ? "true" : "false"}><option value="true">Public event</option><option value="false">Group / organiser only</option></select></label>
            <button className="btn btn-primary" type="submit">Save event changes</button>
          </form>
        </details>
        <details className="content-more-submenu">
          <summary>Cancel event</summary>
          <form action={deleteEvent} className="content-menu-form">
            <input type="hidden" name="event_id" value={event.id}/>
            <p>Cancel and permanently remove this event. Existing attendance responses will be removed with it.</p>
            <button className="text-action danger-action" type="submit">Confirm cancellation</button>
          </form>
        </details>
      </div>
    </details>
  );
}
