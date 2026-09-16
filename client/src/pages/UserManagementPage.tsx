import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw, Users } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import {
  AccountError,
  createAccount,
  editAccount,
  listAccounts,
  resetInitialPassword,
  type Account,
  type AccountRole,
} from "../api/user-management";
import { AppButton, FeedbackState } from "../components/ui";
const roles: AccountRole[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
const blank = {
  name: "",
  email: "",
  role: "REQUESTER" as AccountRole,
  isActive: true,
  password: "",
  confirm: "",
};
const label = (v: string) =>
  v
    .toLowerCase()
    .split("_")
    .map((x) => x[0].toUpperCase() + x.slice(1))
    .join(" ");
function PasswordFields({
  form,
  fields,
  setForm,
  initialPasswordRef,
  confirmPasswordRef,
}: {
  form: typeof blank;
  fields: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<typeof blank>>;
  initialPasswordRef: React.RefObject<HTMLInputElement | null>;
  confirmPasswordRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <>
      <label>
        Initial password
        <input
          className="text-field"
          type="password"
          ref={initialPasswordRef}
          aria-label="Initial password"
          aria-invalid={fields.initialPassword ? "true" : undefined}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {fields.initialPassword && (
          <span className="field-error">{fields.initialPassword}</span>
        )}
      </label>
      <label>
        Confirm password
        <input
          className="text-field"
          type="password"
          ref={confirmPasswordRef}
          aria-label="Confirm password"
          aria-invalid={fields.confirmPassword ? "true" : undefined}
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        />
        {fields.confirmPassword && (
          <span className="field-error">{fields.confirmPassword}</span>
        )}
      </label>
    </>
  );
}

export default function UserManagementPage() {
  const { state } = useAuth(),
    navigate = useNavigate();
  const actor = state.status === "authenticated" ? state.payload.user : null;
  const [items, setItems] = useState<Account[]>([]),
    [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
      "loading",
    ),
    [search, setSearch] = useState(""),
    [role, setRole] = useState(""),
    [selected, setSelected] = useState<Account | null>(null),
    [creating, setCreating] = useState(false),
    [form, setForm] = useState(blank),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [stale, setStale] = useState(false),
    [editorFocusRequest, setEditorFocusRequest] = useState(0);
  const editorHeadingRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLSelectElement>(null);
  const activeRef = useRef<HTMLInputElement>(null);
  const initialPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const loadSequence = useRef(0);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoadState("loading");
    try {
      const accounts = await listAccounts(search.trim(), role);
      if (sequence !== loadSequence.current) return;
      setItems(accounts);
      setLoadState("ready");
    } catch {
      if (sequence === loadSequence.current) setLoadState("error");
    }
  }, [search, role]);
  useEffect(() => {
    void load();
    return () => {
      loadSequence.current++;
    };
  }, [load]);
  useEffect(() => {
    if (!editorFocusRequest) return;
    const heading = editorHeadingRef.current;
    heading?.focus({ preventScroll: true });
    if (window.matchMedia?.("(max-width: 991px)").matches) {
      heading?.scrollIntoView({ block: "start", behavior: "auto" });
    }
  }, [editorFocusRequest]);
  function focusField(fieldNames: string[]) {
    const targets: Record<string, React.RefObject<HTMLElement | null>> = {
      name: nameRef,
      email: emailRef,
      role: roleRef,
      isActive: activeRef,
      initialPassword: initialPasswordRef,
      confirmPassword: confirmPasswordRef,
    };
    const target = fieldNames
      .map((field) => targets[field]?.current)
      .find(Boolean);
    window.setTimeout(() => target?.focus(), 0);
  }
  function open(item?: Account) {
    setMessage("");
    setError("");
    setFields({});
    setStale(false);
    setEditorFocusRequest((value) => value + 1);
    if (item) {
      setSelected(item);
      setCreating(false);
      setForm({
        name: item.name,
        email: item.email,
        role: item.role,
        isActive: item.isActive,
        password: "",
        confirm: "",
      });
    } else {
      setSelected(null);
      setCreating(true);
      setForm(blank);
    }
  }
  function fail(e: unknown) {
    if (e instanceof AccountError) {
      setFields(e.fields);
      focusField(Object.keys(e.fields));
      setStale(e.code === "STALE_RESOURCE");
      setError(
        e.code === "EMAIL_CONFLICT"
          ? "That canonical email is already in use."
          : e.code === "ADMIN_REQUIRED"
            ? e.message
            : e.code === "STALE_RESOURCE"
              ? "This account changed. Reload latest before saving."
              : e.message,
      );
    } else setError("The account action failed. Try again.");
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!selected && form.password !== form.confirm) {
      setFields({ confirmPassword: "Password confirmation must match." });
      focusField(["confirmPassword"]);
      return;
    }
    if (
      selected &&
      (selected.isActive !== form.isActive || selected.role !== form.role) &&
      !window.confirm(
        `Apply access changes to ${selected.name}? Existing sessions will end.${
          selected.isActive &&
          selected.role !== "REQUESTER" &&
          (!form.isActive || form.role === "REQUESTER")
            ? " Any owned tickets will become unassigned and may require reassignment."
            : ""
        }`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setFields({});
    try {
      const next = selected
        ? await editAccount(selected.id, {
            name: form.name,
            email: form.email,
            role: form.role,
            isActive: form.isActive,
            expectedVersion: selected.version,
          })
        : await createAccount({
            name: form.name,
            email: form.email,
            role: form.role,
            isActive: form.isActive,
            initialPassword: form.password,
          });
      setForm((v) => ({ ...v, password: "", confirm: "" }));
      setMessage(selected ? "Account updated." : "Account created.");
      setSelected(next);
      setCreating(false);
      await load();
      if (actor && next.id === actor.id && next.role !== "ADMINISTRATOR") {
        window.dispatchEvent(new Event("toktickit:unauthenticated"));
        navigate("/login", { replace: true });
      }
    } catch (x) {
      fail(x);
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    if (!selected || form.password !== form.confirm) {
      setFields({ confirmPassword: "Password confirmation must match." });
      focusField(["confirmPassword"]);
      return;
    }
    if (
      !window.confirm(
        `Set a new initial password for ${selected.name}? All sessions will end.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const next = await resetInitialPassword(selected.id, {
        initialPassword: form.password,
        expectedVersion: selected.version,
      });
      setSelected(next);
      setForm((v) => ({ ...v, password: "", confirm: "" }));
      setMessage("Initial password reset; existing sessions ended.");
      await load();
      if (actor?.id === next.id) {
        window.dispatchEvent(new Event("toktickit:unauthenticated"));
        navigate("/login", { replace: true });
      }
    } catch (x) {
      fail(x);
    } finally {
      setBusy(false);
    }
  }
  async function reloadSelected() {
    if (!selected) return;
    setBusy(true);
    try {
      const latest = (await listAccounts()).find((x) => x.id === selected.id);
      if (!latest) throw new Error("Account unavailable");
      setSelected(latest);
      setStale(false);
      setError("");
      setFields({});
      setMessage(
        `Loaded account version ${latest.version}. Review your draft and save manually.`,
      );
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-container user-management-page">
      <header className="ticket-detail-header">
        <div>
          <h1>User Management</h1>
          <p className="page-description">
            Create accounts and control one role and activation state.
          </p>
        </div>
        <AppButton icon={<Plus />} onClick={() => open()}>
          Create User
        </AppButton>
      </header>
      {message && (
        <p role="status" className="attachment-action-success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="attachment-action-error">
          {error}
        </p>
      )}
      {stale && (
        <AppButton
          variant="secondary"
          busy={busy}
          onClick={() => void reloadSelected()}
        >
          Reload latest
        </AppButton>
      )}
      <form
        className="admin-filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label>
          Search name or email
          <input
            className="text-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Role
          <select
            className="select-field"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <AppButton type="submit">Apply</AppButton>
      </form>
      {loadState === "loading" && (
        <FeedbackState
          variant="loading"
          title="Loading users"
          message="Retrieving accounts."
        />
      )}
      {loadState === "error" && (
        <FeedbackState
          variant="error"
          title="Users unavailable"
          message="Accounts could not be loaded."
          action={<AppButton onClick={() => void load()}>Retry</AppButton>}
        />
      )}{" "}
      {loadState === "ready" && (
        <div className="admin-layout">
          <section>
            <h2>
              <Users /> Accounts
            </h2>
            {!items.length ? (
              <p>No accounts match the current filters.</p>
            ) : (
              <div className="admin-account-list">
                {items.map((x) => (
                  <article key={x.id}>
                    <div>
                      <strong>{x.name}</strong>
                      <span>{x.email}</span>
                      <span>
                        {label(x.role)} / {x.isActive ? "Active" : "Inactive"}
                      </span>
                      <span>
                        {x.mustChangePassword
                          ? "Password change required"
                          : "Password current"}
                      </span>
                    </div>
                    <AppButton variant="secondary" onClick={() => open(x)}>
                      Edit {x.name}
                    </AppButton>
                  </article>
                ))}
              </div>
            )}
          </section>
          {(creating || selected) && (
            <aside className="admin-editor">
              <h2 ref={editorHeadingRef} tabIndex={-1}>
                {selected ? `Edit ${selected.name}` : "Create User"}
              </h2>
              {selected && <p>Source version: {selected.version}</p>}
              <form onSubmit={save}>
                <label>
                  Name
                  <input
                    className="text-field"
                    id="admin-user-name"
                    ref={nameRef}
                    aria-label="Name"
                    aria-invalid={fields.name ? "true" : undefined}
                    aria-describedby={
                      fields.name ? "admin-user-name-error" : undefined
                    }
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  {fields.name && (
                    <span
                      className="field-error"
                      id="admin-user-name-error"
                      role="alert"
                    >
                      {fields.name}
                    </span>
                  )}
                </label>
                <label>
                  Email
                  <input
                    className="text-field"
                    id="admin-user-email"
                    ref={emailRef}
                    aria-label="Email"
                    aria-invalid={fields.email ? "true" : undefined}
                    aria-describedby={
                      fields.email ? "admin-user-email-error" : undefined
                    }
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                  {fields.email && (
                    <span
                      className="field-error"
                      id="admin-user-email-error"
                      role="alert"
                    >
                      {fields.email}
                    </span>
                  )}
                </label>
                <label>
                  Role
                  <select
                    className="select-field"
                    ref={roleRef}
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value as AccountRole })
                    }
                  >
                    {roles.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    ref={activeRef}
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                  />{" "}
                  Active account
                </label>
                {!selected && (
                  <PasswordFields
                    form={form}
                    fields={fields}
                    setForm={setForm}
                    initialPasswordRef={initialPasswordRef}
                    confirmPasswordRef={confirmPasswordRef}
                  />
                )}
                <AppButton busy={busy} type="submit">
                  {selected ? "Save Changes" : "Create User"}
                </AppButton>
              </form>
              {selected && (
                <section>
                  <h3>Reset initial password</h3>
                  <PasswordFields
                    form={form}
                    fields={fields}
                    setForm={setForm}
                    initialPasswordRef={initialPasswordRef}
                    confirmPasswordRef={confirmPasswordRef}
                  />
                  <AppButton
                    variant="destructive"
                    busy={busy}
                    onClick={() => void reset()}
                  >
                    Reset Password
                  </AppButton>
                </section>
              )}
            </aside>
          )}
        </div>
      )}
      <span className="visually-hidden">
        <RefreshCw />
      </span>
    </div>
  );
}
