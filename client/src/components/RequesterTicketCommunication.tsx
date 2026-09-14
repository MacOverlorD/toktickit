import { useEffect, useState } from "react";
import type { TicketDetail } from "../api/ticket-detail";
import {
  appendEntry,
  indicateResolution,
  listEntries,
  WorkflowError,
  type Entry,
} from "../api/ticket-workflow";
import { AppButton } from "./ui";

const allowed = new Set([
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "REOPENED",
]);
const date = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export default function RequesterTicketCommunication({
  ticket,
  onTicketChange,
  onReload,
}: {
  ticket: TicketDetail;
  onTicketChange: (ticket: TicketDetail) => void;
  onReload: () => Promise<TicketDetail>;
}) {
  const [items, setItems] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [needsReload, setNeedsReload] = useState(false);
  const [timelineState, setTimelineState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  async function load() {
    setTimelineState("loading");
    try {
      setItems(await listEntries(ticket.ticketNumber, "comments"));
      setTimelineState("ready");
    } catch (value) {
      setTimelineState("error");
      throw value;
    }
  }
  useEffect(() => {
    void load().catch(() => {});
  }, [ticket.ticketNumber]);
  async function comment() {
    if (Array.from(draft.trim()).length > 5000) {
      setError("A public comment must contain at most 5000 characters.");
      return;
    }
    if (!draft.trim()) {
      setError("Enter a public comment.");
      return;
    }
    setBusy("comment");
    setError("");
    try {
      await appendEntry(ticket.ticketNumber, "comments", draft);
      setDraft("");
      await Promise.all([onReload(), load()]);
      setNeedsReload(false);
    } catch (value) {
      setError(
        value instanceof WorkflowError
          ? value.message
          : "The comment could not be saved.",
      );
      const results = await Promise.allSettled([onReload(), load()]);
      setNeedsReload(results[0].status === "rejected");
    } finally {
      setBusy("");
    }
  }
  async function indicate() {
    setBusy("indicate");
    setError("");
    try {
      const result = await indicateResolution(
        ticket.ticketNumber,
        ticket.version,
      );
      onTicketChange({
        ...ticket,
        status: result.status,
        version: result.version,
        resolutionIndicatedAt: result.resolutionIndicatedAt,
      });
      setStatus(
        "Resolution indication sent. IT Staff still performs formal resolution.",
      );
    } catch (value) {
      setNeedsReload(
        value instanceof WorkflowError && value.code === "STALE_RESOURCE",
      );
      setError(
        value instanceof WorkflowError && value.code === "STALE_RESOURCE"
          ? "The ticket changed. Reload latest before trying again."
          : value instanceof Error
            ? value.message
            : "Resolution could not be indicated.",
      );
    } finally {
      setBusy("");
    }
  }
  async function reloadLatest() {
    setBusy("reload");
    try {
      await Promise.all([onReload(), load()]);
      setError("");
      setNeedsReload(false);
    } catch {
      setError("The latest ticket could not be loaded. Try again.");
      setNeedsReload(true);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className={"ticket-detail-surface requester-communication"}>
      {allowed.has(ticket.status) && !ticket.resolutionIndicatedAt && (
        <section className={"detail-section"}>
          <h2>Problem Appears Resolved</h2>
          <p>
            This signals that the problem appears resolved. IT Staff still
            performs formal resolution.
          </p>
          <AppButton
            busy={busy === "indicate"}
            disabled={!!busy}
            onClick={() => void indicate()}
          >
            Problem Appears Resolved
          </AppButton>
        </section>
      )}
      {ticket.resolutionIndicatedAt && (
        <section className={"detail-section"}>
          <h2>Resolution indication</h2>
          <p>
            Submitted {date(ticket.resolutionIndicatedAt)}. IT Staff still
            performs formal resolution.
          </p>
        </section>
      )}
      <section
        className={
          "detail-section communication-section communication-comments"
        }
      >
        <h2>Public Comments</h2>
        {timelineState === "loading" ? (
          <p role="status">Loading public comments...</p>
        ) : timelineState === "error" ? (
          <div>
            <p role="alert">Public comments could not be loaded.</p>
            <AppButton
              disabled={!!busy}
              onClick={() => void load().catch(() => {})}
            >
              Retry public comments
            </AppButton>
          </div>
        ) : items.length === 0 ? (
          <p>No public comments yet.</p>
        ) : (
          <ol className={"communication-list"}>
            {items.map((item) => (
              <li key={item.id}>
                <header>
                  <strong>{item.author.name}</strong>
                  <time dateTime={item.createdAt}>{date(item.createdAt)}</time>
                </header>
                <p>{item.content}</p>
              </li>
            ))}
          </ol>
        )}
        <label className={"field-label"} htmlFor={"requester-public-comment"}>
          Public: visible to Requester and staff
        </label>
        <textarea
          id={"requester-public-comment"}
          className={"text-field communication-draft"}
          value={draft}
          disabled={!!busy}
          onChange={(event) => setDraft(event.target.value)}
        />
        <span className={"field-hint"}>
          {Array.from(draft).length}/5000 characters
        </span>
        {error && (
          <p role={"alert"} className={"field-error"}>
            {error}
          </p>
        )}
        {needsReload && (
          <AppButton
            disabled={!!busy}
            busy={busy === "reload"}
            onClick={() => void reloadLatest()}
          >
            Reload latest
          </AppButton>
        )}
        {status && (
          <p role={"status"} className={"attachment-action-success"}>
            {status}
          </p>
        )}
        <AppButton
          busy={busy === "comment"}
          disabled={!!busy}
          onClick={() => void comment()}
        >
          Add Public Comment
        </AppButton>
      </section>
    </div>
  );
}
