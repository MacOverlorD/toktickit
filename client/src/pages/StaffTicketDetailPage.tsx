import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  LockKeyhole,
  Paperclip,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AppButton,
  FeedbackState,
  IconButton,
  TicketBadge,
} from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import type { RequestedPriority, TicketStatus } from "../api/tickets";
import type { TicketAttachmentMetadata } from "../api/ticket-detail";
import {
  appendEntry,
  getOwners,
  getStaffAttachmentContent,
  getStaffAttachments,
  getStaffTicketDetail,
  listEntries,
  updateOperation,
  WorkflowError,
  type Entry,
  type SafeOwner,
  type StaffTicketDetail,
} from "../api/ticket-workflow";

const transitions: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  CANCELLED: ["REOPENED"],
};
const confirmed = new Set<TicketStatus>([
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
  "REOPENED",
]);
const priorities: RequestedPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const label = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((v) => v[0].toUpperCase() + v.slice(1))
    .join(" ");
const date = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
function Field({
  label: name,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={"detail-field"}>
      <dt>{name}</dt>
      <dd>{children}</dd>
    </div>
  );
}
function message(error: unknown) {
  if (!(error instanceof WorkflowError)) return "The action failed. Try again.";
  if (error.code === "STALE_RESOURCE")
    return "This ticket changed. Reload latest before trying again.";
  if (error.code === "INELIGIBLE_OWNER")
    return "Choose an active IT Staff or Administrator owner.";
  if (error.code === "OWNER_REQUIRED")
    return "Assign an eligible owner before this action.";
  if (error.code === "INVALID_TRANSITION")
    return "This status change is no longer available. Reload latest.";
  return error.message;
}
function Entries({
  title,
  kind,
  items,
  onSaved,
}: {
  title: string;
  kind: "comments" | "notes";
  items: Entry[];
  onSaved: () => Promise<void>;
}) {
  const { ticketNumber = "" } = useParams();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (!draft.trim()) {
      setError("Enter a message.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await appendEntry(ticketNumber, kind, draft);
      setDraft("");
      await onSaved();
    } catch (value) {
      setError(message(value));
      try {
        await onSaved();
      } catch {}
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`detail-section communication-section communication-${kind}`}
      aria-labelledby={`${kind}-heading`}
    >
      <div className={"detail-section-heading"}>
        <h2 id={`${kind}-heading`}>{title}</h2>
        <span>
          {kind === "notes"
            ? "Visible only to IT Staff and Administrators"
            : "Visible to Requester and staff"}
        </span>
      </div>
      {items.length === 0 ? (
        <p>No {kind} yet.</p>
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
      <label className={"field-label"} htmlFor={`${kind}-draft`}>
        {kind === "notes"
          ? "Internal: staff only"
          : "Public: visible to Requester"}
      </label>
      <textarea
        id={`${kind}-draft`}
        className={"text-field communication-draft"}
        maxLength={5000}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={busy}
      />
      <span className={"field-hint"}>{draft.length}/5000 characters</span>
      {error && (
        <p role={"alert"} className={"field-error"}>
          {error}
        </p>
      )}
      <AppButton
        busy={busy}
        busyLabel={"Saving..."}
        onClick={() => void save()}
      >
        Add {kind === "notes" ? "Internal Note" : "Public Comment"}
      </AppButton>
    </section>
  );
}

export default function StaffTicketDetailPage() {
  const { ticketNumber = "" } = useParams();
  const { state: authState } = useAuth();
  const currentUserId =
    authState.status === "authenticated" ? authState.payload.user.id : 0;
  const [detail, setDetail] = useState<StaffTicketDetail | null>(null);
  const [owners, setOwners] = useState<SafeOwner[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachmentMetadata[]>(
    [],
  );
  const [comments, setComments] = useState<Entry[]>([]);
  const [notes, setNotes] = useState<Entry[]>([]);
  const [state, setState] = useState<
    "loading" | "ready" | "not-found" | "error"
  >("loading");
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [priority, setPriority] = useState<RequestedPriority>("MEDIUM");
  const [status, setStatus] = useState<TicketStatus>("OPEN");
  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const [next, eligible, files, publicItems, privateItems] =
        await Promise.all([
          getStaffTicketDetail(ticketNumber),
          getOwners(),
          getStaffAttachments(ticketNumber),
          listEntries(ticketNumber, "comments"),
          listEntries(ticketNumber, "notes"),
        ]);
      setDetail(next);
      setOwners(eligible);
      setAttachments(files);
      setComments(publicItems);
      setNotes(privateItems);
      setOwnerId(next.owner ? String(next.owner.id) : "");
      setPriority(next.itPriority);
      setStatus(transitions[next.status][0] ?? next.status);
      setState("ready");
    } catch (value) {
      setState(
        value instanceof WorkflowError &&
          (value.code === "RESOURCE_NOT_FOUND" ||
            value.code === "INVALID_TICKET_NUMBER")
          ? "not-found"
          : "error",
      );
    }
  }, [ticketNumber]);
  useEffect(() => {
    void load();
  }, [load]);
  async function refreshEntries() {
    const [next, publicItems, privateItems] = await Promise.all([
      getStaffTicketDetail(ticketNumber),
      listEntries(ticketNumber, "comments"),
      listEntries(ticketNumber, "notes"),
    ]);
    setDetail(next);
    setComments(publicItems);
    setNotes(privateItems);
  }
  async function update(kind: "owner" | "priority" | "status", body: object) {
    if (!detail) return;
    if (
      kind === "status" &&
      confirmed.has(status) &&
      !window.confirm(`Change ${detail.ticketNumber} to ${label(status)}?`)
    )
      return;
    setBusy(kind);
    setError("");
    setFeedback("");
    try {
      const next = await updateOperation(ticketNumber, kind, {
        ...body,
        expectedVersion: detail.version,
        ...(kind === "status" && confirmed.has(status)
          ? { confirmed: true }
          : {}),
      });
      setDetail({ ...detail, ...next });
      setOwnerId(next.owner ? String(next.owner.id) : "");
      setPriority(next.itPriority);
      setStatus(transitions[next.status][0] ?? next.status);
      setFeedback("Ticket updated.");
    } catch (value) {
      setError(message(value));
    } finally {
      setBusy("");
    }
  }
  async function content(
    item: TicketAttachmentMetadata,
    disposition: "inline" | "attachment",
  ) {
    setError("");
    const preview =
      disposition === "inline" ? window.open("about:blank", "_blank") : null;
    try {
      const blob = await getStaffAttachmentContent(
        ticketNumber,
        item.id,
        disposition,
      );
      const url = URL.createObjectURL(blob);
      if (preview) preview.location.replace(url);
      else {
        const link = document.createElement("a");
        link.href = url;
        link.download = item.originalName;
        link.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (value) {
      preview?.close();
      setError(message(value));
    }
  }
  if (state === "loading")
    return (
      <div className={"page-container"}>
        <FeedbackState
          variant={"loading"}
          title={"Loading ticket"}
          message={"Retrieving staff ticket details."}
        />
      </div>
    );
  if (state === "not-found")
    return (
      <div className={"page-container"}>
        <FeedbackState
          variant={"no-results"}
          title={"Ticket not found"}
          message={"This ticket is not available."}
          action={
            <Link
              className={"app-button app-button-secondary"}
              to={"/staff/tickets"}
            >
              Back to queue
            </Link>
          }
        />
      </div>
    );
  if (state === "error" || !detail)
    return (
      <div className={"page-container"}>
        <FeedbackState
          variant={"error"}
          title={"Ticket unavailable"}
          message={"The ticket could not be loaded."}
          action={<AppButton onClick={() => void load()}>Retry</AppButton>}
        />
      </div>
    );
  return (
    <div className={"page-container ticket-detail-page"}>
      <header className={"ticket-detail-header"}>
        <div>
          <Link className={"detail-back-link"} to={"/staff/tickets"}>
            <ArrowLeft />
            Back to queue
          </Link>
          <h1>{detail.ticketNumber}</h1>
          <p className={"page-description"}>
            Updated {date(detail.updatedAt)} ? Version {detail.version}
          </p>
        </div>
        <div className={"ticket-detail-badges"}>
          <TicketBadge kind={"status"} value={detail.status} />
          <TicketBadge kind={"priority"} value={detail.itPriority} />
        </div>
      </header>
      {feedback && (
        <p role={"status"} className={"attachment-action-success"}>
          {feedback}
        </p>
      )}
      {error && (
        <>
          <p role={"alert"} className={"attachment-action-error"}>
            {error}
          </p>
          {error.includes("Reload latest") && (
            <AppButton variant={"secondary"} onClick={() => void load()}>
              Reload latest
            </AppButton>
          )}
        </>
      )}
      <div className={"ticket-detail-surface"}>
        <section className={"detail-section"}>
          <div className={"detail-section-heading"}>
            <h2>Request</h2>
            <span>
              <LockKeyhole /> Read-only
            </span>
          </div>
          <dl className={"detail-grid detail-request-grid"}>
            <Field label={"Ticket Number"}>{detail.ticketNumber}</Field>
            <Field label={"Created"}>{date(detail.ticketDate)}</Field>
            <Field label={"Summary"}>{detail.summary}</Field>
            <Field label={"Description"}>
              <span className={"detail-description"}>{detail.description}</span>
            </Field>
          </dl>
        </section>
        <section className={"detail-section"}>
          <h2>Classification and requester</h2>
          <dl className={"detail-grid"}>
            <Field label={"Category"}>{detail.category.name}</Field>
            <Field label={"Related System"}>{detail.relatedSystem.name}</Field>
            <Field label={"Requested Priority"}>
              <TicketBadge kind={"priority"} value={detail.requestedPriority} />
            </Field>
            <Field label={"Requester"}>
              {detail.requester.name} ({detail.requester.email})
            </Field>
            <Field label={"Resolution indication"}>
              {detail.resolutionIndicatedAt
                ? `${detail.resolutionIndicatedBy?.name ?? "Requester"} at ${date(detail.resolutionIndicatedAt)}`
                : "Not indicated"}
            </Field>
          </dl>
        </section>
        <section className={"detail-section staff-operation-grid"}>
          <h2>Operations</h2>
          <div>
            <label className={"field-label"} htmlFor={"owner"}>
              Owner
            </label>
            <select
              id={"owner"}
              className={"select-field"}
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
            >
              <option value={""}>Unassigned</option>
              {owners.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <div className={"form-actions"}>
              {!detail.owner && (
                <AppButton
                  variant={"secondary"}
                  disabled={!!busy}
                  onClick={() =>
                    void update("owner", { ownerId: currentUserId })
                  }
                >
                  Claim
                </AppButton>
              )}
              <AppButton
                busy={busy === "owner"}
                onClick={() =>
                  void update("owner", {
                    ownerId: ownerId ? Number(ownerId) : null,
                  })
                }
              >
                Save Owner
              </AppButton>
            </div>
          </div>
          <div>
            <label className={"field-label"} htmlFor={"priority"}>
              IT Priority
            </label>
            <select
              id={"priority"}
              className={"select-field"}
              value={priority}
              onChange={(e) => setPriority(e.target.value as RequestedPriority)}
            >
              {priorities.map((item) => (
                <option key={item} value={item}>
                  {label(item)}
                </option>
              ))}
            </select>
            <AppButton
              busy={busy === "priority"}
              onClick={() => void update("priority", { itPriority: priority })}
            >
              Save IT Priority
            </AppButton>
          </div>
          <div>
            <label className={"field-label"} htmlFor={"status"}>
              Next Status
            </label>
            <select
              id={"status"}
              className={"select-field"}
              value={status}
              onChange={(e) => setStatus(e.target.value as TicketStatus)}
            >
              {transitions[detail.status].map((item) => (
                <option key={item} value={item}>
                  {label(item)}
                </option>
              ))}
            </select>
            <AppButton
              busy={busy === "status"}
              disabled={transitions[detail.status].length === 0}
              onClick={() => void update("status", { status })}
            >
              Change Status
            </AppButton>
          </div>
        </section>
        <section className={"detail-section"}>
          <div className={"detail-section-heading"}>
            <h2>
              <Paperclip /> Attachments
            </h2>
            <span>Read-only</span>
          </div>
          {attachments.length === 0 ? (
            <p>No attachments</p>
          ) : (
            <ul className={"detail-attachment-list"}>
              {attachments.map((item) => (
                <li className={"detail-attachment-row"} key={item.id}>
                  <FileText />
                  <div className={"detail-attachment-copy"}>
                    <strong>{item.originalName}</strong>
                    <span>
                      {item.mimeType} / {item.sizeBytes} bytes
                    </span>
                  </div>
                  {!item.isRemoved && (
                    <div className={"attachment-actions"}>
                      <IconButton
                        label={"Preview " + item.originalName}
                        icon={<Eye />}
                        onClick={() => void content(item, "inline")}
                      />
                      <IconButton
                        label={"Download " + item.originalName}
                        icon={<Download />}
                        onClick={() => void content(item, "attachment")}
                      />
                    </div>
                  )}
                  <span>{item.isRemoved ? "Removed" : "Active"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <Entries
          title={"Public Comments"}
          kind={"comments"}
          items={comments}
          onSaved={refreshEntries}
        />
        <Entries
          title={"Internal Notes"}
          kind={"notes"}
          items={notes}
          onSaved={refreshEntries}
        />
      </div>
    </div>
  );
}
