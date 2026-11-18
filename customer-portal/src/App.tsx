import { useEffect, useState, type FormEvent } from "react";
import "./App.css";
import { api, getToken, setToken } from "./api";
import { actionText, isRtl, languages, requirementText, statusText, text, type CopyKey } from "./i18n";

type View =
  | "dashboard"
  | "profile"
  | "questionnaire"
  | "company"
  | "other"
  | "people"
  | "requests"
  | "notifications"
  | "settings";

type Workspace = {
  user: { full_name: string; email: string; designation: string | null; preferred_language: string };
  organisation: {
    legal_name: string;
    trading_name: string | null;
    registration_number: string | null;
    country_of_incorporation: string;
    registered_address: string | null;
    principal_place_of_business: string | null;
    contact_name: string;
    business_email: string;
    contact_number: string;
  };
  application: { reference: string; status: string };
  progress: {
    profile_percent: number;
    questionnaire_percent: number;
    documents_satisfied: number;
    documents_required: number;
    people_unlocked: boolean;
    open_requests: number;
    next_action: string;
  };
  requirements: { id: number; code?: string; name: string; satisfied: boolean }[];
  notifications: { id: number; title: string; body: string; is_read: boolean }[];
};

type Question = {
  id: number;
  type: string;
  required: boolean;
  prompt: string;
  options: { code: string; label: string }[];
  answer: string;
};

type Questionnaire = {
  notice: string;
  translation_status: string;
  response_status: string;
  editable: boolean;
  sections_complete: number;
  sections_total: number;
  sections: { id: number; title: string; complete: boolean; questions: Question[] }[];
};

const groups: { key: CopyKey; items: { id: View; key: CopyKey }[] }[] = [
  { key: "workspaceGroup", items: [{ id: "dashboard", key: "dashboard" }] },
  { key: "onboardingGroup", items: [{ id: "profile", key: "profile" }, { id: "questionnaire", key: "questionnaire" }] },
  { key: "documentsGroup", items: [{ id: "company", key: "companyDocs" }, { id: "other", key: "otherDocs" }] },
  { key: "organisationGroup", items: [{ id: "people", key: "people" }] },
  { key: "messagesGroup", items: [{ id: "requests", key: "requests" }, { id: "notifications", key: "notifications" }] },
  { key: "accountGroup", items: [{ id: "settings", key: "settings" }] },
];

function App() {
  const [token, setTokenState] = useState(getToken());
  const [mode, setMode] = useState<"home" | "login" | "register" | "reset">("home");
  const [view, setView] = useState<View>("dashboard");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState("en");

  const loadWorkspace = async () => {
    const data = await api<Workspace>("/customer/workspace");
    setWorkspace(data);
    setLanguage(data.user.preferred_language || "en");
  };

  useEffect(() => {
    document.documentElement.dir = isRtl(language) ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!token) return;
    loadWorkspace().catch((error: Error) => {
      setMessage(error.message);
      if (error.message.toLowerCase().includes("sign in")) {
        setToken(null);
        setTokenState(null);
      }
    });
  }, [token]);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage("");
    try {
      const result = await api<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      if (!result.access_token) return;
      setToken(result.access_token);
      setTokenState(result.access_token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text(language, "signInFailed"));
    }
  };

  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    if (password !== String(form.get("confirm_password") || "")) {
      setMessage(text(language, "passwordsMismatch"));
      return;
    }
    setMessage("");
    try {
      const created = await api<{ id: number }>("/clients/register", {
        method: "POST",
        body: JSON.stringify({
          company_name: form.get("company_name"),
          trading_name: form.get("trading_name") || null,
          registration_number: form.get("registration_number") || null,
          country: form.get("country"),
          contact_name: form.get("contact_name"),
          designation: form.get("designation") || null,
          business_email: form.get("business_email"),
          contact_number: form.get("contact_number"),
          password,
        }),
      });
      const result = await api<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.get("business_email"), password }),
      });
      setToken(result.access_token);
      setTokenState(result.access_token);
      setMessage(`Organisation registered. Reference will appear on the overview. Client ${created.id}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text(language, "registrationFailed"));
    }
  };

  if (token && !workspace) {
    return <main className="gate-panel"><p>{text(language, "opening")}</p></main>;
  }

  if (!token || !workspace) {
    return (
      <div className="gate">
        <aside className="gate-brand">
          <div className="brand">
            <span className="mark">E</span>
            <div>
              <strong>{text(language, "brand")}</strong>
              <small>{text(language, "portal")}</small>
            </div>
          </div>
          <div>
            <h1>{text(language, "headline")}</h1>
            <p>{text(language, "gateLead")}</p>
          </div>
          <ol className="steps">
            <li><span>1</span><div><strong>{text(language, "stepAccount")}</strong><small>{text(language, "stepAccountHint")}</small></div></li>
            <li><span>2</span><div><strong>{text(language, "stepQuestionnaire")}</strong><small>{text(language, "stepQuestionnaireHint")}</small></div></li>
            <li><span>3</span><div><strong>{text(language, "stepDocuments")}</strong><small>{text(language, "stepDocumentsHint")}</small></div></li>
            <li><span>4</span><div><strong>{text(language, "stepReview")}</strong><small>{text(language, "stepReviewHint")}</small></div></li>
          </ol>
        </aside>
        <main className="gate-panel">
          {mode === "home" ? (
            <section className="auth-card">
              <h2>{text(language, "startApplication")}</h2>
              <p className="lede">{text(language, "demoNote")}</p>
              <div className="auth-actions">
                <button className="btn" onClick={() => { setMode("register"); setMessage(""); }}>{text(language, "register")}</button>
                <button className="btn btn-ghost" onClick={() => { setMode("login"); setMessage(""); }}>{text(language, "signIn")}</button>
              </div>
            </section>
          ) : (
            <form className="auth-card" onSubmit={mode === "login" ? signIn : mode === "register" ? register : async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              if (mode === "reset" && form.get("token")) {
                const result = await api<{ message: string }>("/auth/password-reset/confirm", {
                  method: "POST",
                  body: JSON.stringify({ token: form.get("token"), new_password: form.get("new_password") }),
                });
                setMessage(result.message);
                setMode("login");
                return;
              }
              const result = await api<{ message: string; demonstration_reset_code: string | null }>("/auth/password-reset/request", {
                method: "POST",
                body: JSON.stringify({ email: form.get("email") }),
              });
              setMessage(`${result.message}${result.demonstration_reset_code ? ` Demonstration code: ${result.demonstration_reset_code}` : ""}`);
            }}>
              <button type="button" className="btn-text" onClick={() => setMode("home")}>{text(language, "back")}</button>
              <h2>{mode === "login" ? text(language, "signIn") : mode === "register" ? text(language, "registerTitle") : text(language, "resetPassword")}</h2>
              {mode === "register" && (
                <>
                  <label>{text(language, "legalName")}<input name="company_name" required minLength={2} /></label>
                  <label>{text(language, "tradingName")}<input name="trading_name" /></label>
                  <label>{text(language, "registrationNumber")}<input name="registration_number" /></label>
                  <label>{text(language, "countryOfIncorporation")}<input name="country" required /></label>
                  <label>{text(language, "contactName")}<input name="contact_name" required /></label>
                  <label>{text(language, "designation")}<input name="designation" /></label>
                  <label>{text(language, "contactNumber")}<input name="contact_number" required minLength={7} /></label>
                </>
              )}
              {mode !== "reset" && <label>{text(language, "businessEmail")}<input name={mode === "register" ? "business_email" : "email"} type="email" required /></label>}
              {mode === "reset" && <label>{text(language, "businessEmail")}<input name="email" type="email" required /></label>}
              {mode !== "reset" && <label>{text(language, "password")}<input name="password" type="password" required minLength={8} /></label>}
              {mode === "register" && <label>{text(language, "confirmPassword")}<input name="confirm_password" type="password" required minLength={8} /></label>}
              {mode === "reset" && (
                <>
                  <label>{text(language, "resetCode")}<input name="token" /></label>
                  <label>{text(language, "newPassword")}<input name="new_password" type="password" minLength={8} /></label>
                </>
              )}
              <button className="btn" type="submit">{mode === "login" ? text(language, "signIn") : mode === "register" ? text(language, "createAccount") : text(language, "continue")}</button>
              {mode === "login" && <button type="button" className="btn-text" onClick={() => setMode("reset")}>{text(language, "forgotPassword")}</button>}
              {message && <p className="form-message">{message}</p>}
            </form>
          )}
        </main>
      </div>
    );
  }

  const pageKey = groups.flatMap((group) => group.items).find((item) => item.id === view)?.key || "dashboard";
  const unread = workspace.notifications.filter((item) => !item.is_read).length;
  const initials = workspace.user.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark">E</span>
          <div>
            <strong>{text(language, "brand")}</strong>
            <small>{text(language, "portal")}</small>
          </div>
        </div>
        <div className="side-scroll">
          {groups.map((group) => (
            <div className="side-group" key={group.key}>
              <div className="side-label">{text(language, group.key)}</div>
              {group.items.map((item) => (
                <button key={item.id} className={view === item.id ? "nav-link active" : "nav-link"} onClick={() => setView(item.id)}>
                  {text(language, item.key)}
                  {item.id === "notifications" && unread > 0 && <span className="dot">{unread}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="side-user">
          <span className="avatar">{initials || "EC"}</span>
          <div>
            <strong>{workspace.user.full_name}</strong>
            <small>{workspace.user.email}</small>
            <button className="btn-text" onClick={async () => {
              await api("/auth/logout", { method: "POST" }).catch(() => undefined);
              setToken(null);
              setTokenState(null);
              setWorkspace(null);
            }}>{text(language, "signOut")}</button>
          </div>
        </div>
      </aside>
      <header className="topbar">
        <div>
          <span className="crumb">{workspace.application.reference}</span>
          <strong>{workspace.organisation.legal_name}</strong>
        </div>
        <div className="top-actions">
          <span className={`status ${workspace.application.status.replaceAll(" ", "-").toLowerCase()}`}>{statusText(language, workspace.application.status)}</span>
          <select aria-label={text(language, "language")} value={language} onChange={async (event) => {
            const next = event.target.value;
            const user = await api<{ preferred_language: string }>("/auth/language", {
              method: "PUT",
              body: JSON.stringify({ language: next }),
            });
            setLanguage(user.preferred_language);
          }}>
            {languages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
        </div>
      </header>
      <main className="workspace-main">
        <div className="page-head">
          <div>
            <h1>{text(language, pageKey)}</h1>
            {view === "dashboard" && <p>{text(language, "welcome")}</p>}
          </div>
        </div>
        {view === "dashboard" && <Dashboard language={language} workspace={workspace} onOpen={setView} />}
        {view === "profile" && <Profile language={language} workspace={workspace} onSaved={loadWorkspace} />}
        {view === "questionnaire" && <Questionnaire language={language} labels={{ save: text(language, "save"), submit: text(language, "submit") }} onChanged={loadWorkspace} />}
        {view === "company" && <Documents language={language} category="company" requirements={workspace.requirements} onChanged={loadWorkspace} />}
        {view === "other" && <Documents language={language} category="other" requirements={[]} onChanged={loadWorkspace} />}
        {view === "people" && <People language={language} unlocked={workspace.progress.people_unlocked} />}
        {view === "requests" && <Requests language={language} />}
        {view === "notifications" && <Notifications language={language} items={workspace.notifications} onChanged={loadWorkspace} />}
        {view === "settings" && <Settings language={language} onChanged={loadWorkspace} />}
        {message && <p className="form-message">{message}</p>}
      </main>
    </div>
  );
}

function Dashboard({ language, workspace, onOpen }: { language: string; workspace: Workspace; onOpen: (view: View) => void }) {
  const progress = workspace.progress;
  const organisation = workspace.organisation;
  const overall = Math.round((progress.profile_percent + progress.questionnaire_percent + (progress.documents_required ? (progress.documents_satisfied / progress.documents_required) * 100 : 0)) / 3);
  const tasks: { step: string; title: string; detail: string; state: string; view: View; enabled: boolean }[] = [
    { step: "1", title: text(language, "profileTask"), detail: text(language, "profileTaskDetail"), state: text(language, "percentComplete", { n: progress.profile_percent }), view: "profile", enabled: true },
    { step: "1", title: text(language, "questionnaireTask"), detail: actionText(language, progress.next_action), state: text(language, "percentComplete", { n: progress.questionnaire_percent }), view: "questionnaire", enabled: true },
    { step: "2", title: text(language, "companyTask"), detail: text(language, "companyTaskDetail"), state: text(language, "documentsOf", { done: progress.documents_satisfied, total: progress.documents_required }), view: "company", enabled: true },
    { step: "2", title: text(language, "otherTask"), detail: text(language, "otherTaskDetail"), state: text(language, "optional"), view: "other", enabled: true },
    { step: "2", title: text(language, "peopleTask"), detail: text(language, "peopleTaskDetail"), state: progress.people_unlocked ? text(language, "open") : text(language, "locked"), view: "people", enabled: progress.people_unlocked },
    { step: "3", title: text(language, "requestsTask"), detail: text(language, "requestsTaskDetail"), state: progress.open_requests ? text(language, "requestsOpen", { n: progress.open_requests }) : text(language, "noneOpen"), view: "requests", enabled: true },
  ];
  const stepName = (step: string) => text(language, step === "1" ? "accountStep" : step === "2" ? "evidenceStep" : "reviewStep");
  return (
    <div className="stack">
      <section className="panel entity">
        <div className="entity-head">
          <div>
            <div className="kicker">{text(language, "organisation")}</div>
            <h2>{organisation.legal_name}</h2>
          </div>
          <div>
            <div className="progress-line" aria-hidden="true"><span style={{ width: `${overall}%` }} /></div>
            <small>{text(language, "overall", { n: overall })}</small>
          </div>
        </div>
        <div className="entity-grid">
          <div><span className="field-label">{text(language, "country")}</span><div className="field-value">{organisation.country_of_incorporation}</div></div>
          <div><span className="field-label">{text(language, "registration")}</span><div className="field-value">{organisation.registration_number || "—"}</div></div>
          <div><span className="field-label">{text(language, "contact")}</span><div className="field-value">{organisation.contact_name}</div></div>
          <div><span className="field-label">{text(language, "email")}</span><div className="field-value">{organisation.business_email}</div></div>
          <div><span className="field-label">{text(language, "phone")}</span><div className="field-value">{organisation.contact_number}</div></div>
          <div><span className="field-label">{text(language, "application")}</span><div className="field-value">{workspace.application.reference}</div></div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>{text(language, "onboardingTasks")}</h2>
          <span className="kicker">{statusText(language, workspace.application.status)}</span>
        </div>
        {["1", "2", "3"].map((step) => (
          <div className="step" key={step}>
            <div className="step-title"><b>{step}</b><strong>{stepName(step)}</strong></div>
            {tasks.filter((task) => task.step === step).map((task) => (
              <article className="task" key={task.view}>
                <div><strong>{task.title}</strong><small>{task.detail}</small></div>
                <span className="status">{task.state}</span>
                <button className="btn" disabled={!task.enabled} onClick={() => onOpen(task.view)}>{task.enabled ? text(language, "open") : text(language, "locked")}</button>
              </article>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}

function Profile({ language, workspace, onSaved }: { language: string; workspace: Workspace; onSaved: () => Promise<void> }) {
  const organisation = workspace.organisation;
  return (
    <form className="panel form-grid" onSubmit={async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await api("/customer/profile", {
        method: "PUT",
        body: JSON.stringify({
          trading_name: form.get("trading_name"),
          registered_address: form.get("registered_address"),
          principal_place_of_business: form.get("principal_place_of_business"),
          designation: form.get("designation"),
          contact_number: form.get("contact_number"),
        }),
      });
      await onSaved();
    }}>
      <label>{text(language, "legalName")}<input value={organisation.legal_name} readOnly /></label>
      <label>{text(language, "tradingName")}<input name="trading_name" defaultValue={organisation.trading_name || ""} /></label>
      <label>{text(language, "registrationNumber")}<input value={organisation.registration_number || ""} readOnly /></label>
      <label>{text(language, "country")}<input value={organisation.country_of_incorporation} readOnly /></label>
      <label>{text(language, "registeredAddress")}<textarea name="registered_address" defaultValue={organisation.registered_address || ""} /></label>
      <label>{text(language, "principalPlace")}<textarea name="principal_place_of_business" defaultValue={organisation.principal_place_of_business || ""} /></label>
      <label>{text(language, "contact")}<input value={organisation.contact_name} readOnly /></label>
      <label>{text(language, "email")}<input value={organisation.business_email} readOnly /></label>
      <label>{text(language, "phone")}<input name="contact_number" defaultValue={organisation.contact_number} /></label>
      <label>{text(language, "designation")}<input name="designation" defaultValue={workspace.user.designation || ""} /></label>
      <button className="btn" type="submit">{text(language, "saveProfile")}</button>
    </form>
  );
}

function Questionnaire({ language, labels, onChanged }: { language: string; labels: { save: string; submit: string }; onChanged: () => Promise<void> }) {
  const [data, setData] = useState<Questionnaire | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    const next = await api<Questionnaire>(`/customer/questionnaire?language=${language}`);
    setData(next);
    setSectionId((current) => current ?? next.sections[0]?.id ?? null);
  };

  useEffect(() => { load().catch((reason: Error) => setError(reason.message)); }, [language]);

  if (!data) return <p>{error || text(language, "loadingQuestionnaire")}</p>;
  const section = data.sections.find((item) => item.id === sectionId) || data.sections[0];

  const collect = () => {
    if (!section) return [];
    return section.questions.map((question) => {
      if (question.type === "multi_choice") {
        const selected = Array.from(document.querySelectorAll<HTMLInputElement>(`input[name="q-${question.id}"]:checked`)).map((input) => input.value);
        return { question_id: question.id, value: selected.join(",") };
      }
      const field = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="q-${question.id}"]`);
      return { question_id: question.id, value: field?.value || "" };
    });
  };

  const save = async (submit: boolean) => {
    setError("");
    try {
      await api("/customer/questionnaire", {
        method: "PUT",
        body: JSON.stringify({ language, answers: collect() }),
      });
      if (submit) await api(`/customer/questionnaire/submit?language=${language}`, { method: "POST" });
      await load();
      await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : text(language, "saveFailed"));
    }
  };

  return (
    <div className="questionnaire">
      <aside className="panel section-index">
        {data.sections.map((item, index) => (
          <button key={item.id} className={item.id === section?.id ? "active" : ""} onClick={() => setSectionId(item.id)}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.title}
            <small>{item.complete ? text(language, "complete") : text(language, "open")}</small>
          </button>
        ))}
      </aside>
      <form className="panel" onSubmit={(event) => event.preventDefault()}>
        <p className="notice">{text(language, data.translation_status === "demonstration" ? "demonstrationNotice" : "sampleNotice")}</p>
        <h2>{section?.title}</h2>
        {section?.questions.map((question) => (
          <label key={question.id} className="question">
            <span>{question.prompt}{question.required ? " *" : ""}</span>
            {question.type === "textarea" && <textarea name={`q-${question.id}`} defaultValue={question.answer} disabled={!data.editable} />}
            {question.type === "text" && <input name={`q-${question.id}`} defaultValue={question.answer} disabled={!data.editable} />}
            {question.type === "date" && <input type="date" name={`q-${question.id}`} defaultValue={question.answer} disabled={!data.editable} />}
            {question.type === "single_choice" && (
              <select name={`q-${question.id}`} defaultValue={question.answer} disabled={!data.editable}>
                <option value="">{text(language, "select")}</option>
                {question.options.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
              </select>
            )}
            {question.type === "multi_choice" && (
              <div className="choices">
                {question.options.map((option) => (
                  <label key={option.code}>
                    <input type="checkbox" name={`q-${question.id}`} value={option.code} defaultChecked={question.answer.split(",").includes(option.code)} disabled={!data.editable} />
                    {option.label}
                  </label>
                ))}
              </div>
            )}
          </label>
        ))}
        <div className="row-actions">
          <button className="btn btn-ghost" type="button" onClick={() => save(false)} disabled={!data.editable}>{labels.save}</button>
          <button className="btn" type="button" onClick={() => save(true)} disabled={!data.editable}>{labels.submit}</button>
        </div>
        <p>{text(language, "sectionProgress", { status: statusText(language, data.response_status), done: data.sections_complete, total: data.sections_total })}</p>
        {error && <p className="form-message">{error}</p>}
      </form>
    </div>
  );
}

function Documents({ language, category, requirements, onChanged }: { language: string; category: "company" | "other"; requirements: Workspace["requirements"]; onChanged: () => Promise<void> }) {
  const [rows, setRows] = useState<{ id: number; category: string; description: string | null; status: string; feedback: string | null; versions: { id: number; version_number: number; filename: string; uploaded_at: string | null }[] }[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    const data = await api<{ documents: typeof rows }>("/customer/documents");
    setRows(data.documents.filter((item) => item.category === category));
  };

  useEffect(() => { load().catch((reason: Error) => setError(reason.message)); }, [category]);

  return (
    <div className="stack">
      {category === "company" && (
        <div className="panel">
          <h2>{text(language, "companyChecklist")}</h2>
          <p>{text(language, "checklistHint")}</p>
          <ul className="checklist">
            {requirements.map((item) => <li key={item.id} className={item.satisfied ? "done" : ""}>{requirementText(language, item.code || "", item.name)}</li>)}
          </ul>
        </div>
      )}
      <form className="panel" onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const selected = Array.from(form.querySelectorAll<HTMLInputElement>("input[name='requirement']:checked")).map((input) => input.value);
        data.set("requirement_ids", selected.join(","));
        data.set("category", category);
        setError("");
        try {
          await api("/customer/documents", { method: "POST", body: data });
          form.reset();
          await load();
          await onChanged();
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : text(language, "uploadFailed"));
        }
      }}>
        <h2>{text(language, category === "company" ? "uploadCompany" : "uploadOther")}</h2>
        {category === "other" && <label>{text(language, "description")}<input name="description" required /></label>}
        {category === "company" && (
          <div className="choices">
            {requirements.map((item) => <label key={item.id}><input type="checkbox" name="requirement" value={item.id} />{requirementText(language, item.code || "", item.name)}</label>)}
          </div>
        )}
        <label>{text(language, "file")}<input name="file" type="file" required /></label>
        <button className="btn" type="submit">{text(language, "upload")}</button>
        {error && <p className="form-message">{error}</p>}
      </form>
      <div className="panel">
        <h2>{text(language, "uploadedFiles")}</h2>
        {rows.length === 0 && <p>{text(language, "noDocuments")}</p>}
        {rows.map((row) => (
          <article key={row.id} className="file-row">
            <div>
              <strong>{row.description || row.versions[0]?.filename}</strong>
              <small>{statusText(language, row.status)}{row.feedback ? ` · ${row.feedback}` : ""}</small>
            </div>
            <span>{row.versions[0] ? `v${row.versions[0].version_number}` : ""}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function People({ language, unlocked }: { language: string; unlocked: boolean }) {
  const [parties, setParties] = useState<{ id: number; party_type: string; full_name: string; ownership_percentage: string | null }[]>([]);
  const [error, setError] = useState("");
  const load = async () => setParties((await api<{ parties: typeof parties }>("/customer/parties")).parties);
  useEffect(() => { if (unlocked) load().catch((reason: Error) => setError(reason.message)); }, [unlocked]);
  if (!unlocked) return <div className="panel"><h2>{text(language, "peopleLockedTitle")}</h2><p>{text(language, "peopleLockedBody")}</p></div>;
  return (
    <div className="stack">
      <form className="panel form-grid" onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError("");
        try {
          await api("/customer/parties", { method: "POST", body: JSON.stringify(Object.fromEntries(form.entries())) });
          event.currentTarget.reset();
          await load();
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : text(language, "personFailed"));
        }
      }}>
        <label>{text(language, "people")}
          <select name="party_type">
            <option value="director">{text(language, "director")}</option>
            <option value="beneficial_owner">{text(language, "beneficialOwner")}</option>
            <option value="key_controller">{text(language, "keyController")}</option>
          </select>
        </label>
        <label>{text(language, "fullName")}<input name="full_name" required /></label>
        <label>{text(language, "nationality")}<input name="nationality" /></label>
        <label>{text(language, "relationship")}<input name="relationship_to_organisation" /></label>
        <label>{text(language, "ownershipPercent")}<input name="ownership_percentage" /></label>
        <button className="btn" type="submit">{text(language, "addPerson")}</button>
        {error && <p className="form-message">{error}</p>}
      </form>
      <div className="panel">
        {parties.map((person) => (
          <article key={person.id} className="file-row">
            <strong>{person.full_name}</strong>
            <span>{text(language, person.party_type === "beneficial_owner" ? "beneficialOwner" : person.party_type === "key_controller" ? "keyController" : "director")}{person.ownership_percentage ? ` · ${person.ownership_percentage}%` : ""}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function Requests({ language }: { language: string }) {
  const [rows, setRows] = useState<{ id: number; reference: string; description: string; status: string; due_date: string | null; replies: { message: string }[] }[]>([]);
  const load = async () => setRows((await api<{ requests: typeof rows }>("/customer/requests")).requests);
  useEffect(() => { load().catch(() => undefined); }, []);
  return (
    <div className="stack">
      {rows.length === 0 && <div className="panel"><p>{text(language, "noRequests")}</p></div>}
      {rows.map((row) => (
        <form key={row.id} className="panel" onSubmit={async (event) => {
          event.preventDefault();
          const message = String(new FormData(event.currentTarget).get("message") || "");
          await api(`/customer/requests/${row.id}/reply`, { method: "POST", body: JSON.stringify({ message }) });
          await load();
        }}>
          <p className="eyebrow">{row.reference} · {statusText(language, row.status)}</p>
          <h2>{row.description}</h2>
          {row.due_date && <p>{text(language, "due", { date: row.due_date })}</p>}
          {row.replies.map((reply, index) => <p key={index}>{reply.message}</p>)}
          {row.status !== "Closed" && (
            <>
              <label>{text(language, "response")}<textarea name="message" required /></label>
              <button className="btn" type="submit">{text(language, "sendResponse")}</button>
            </>
          )}
        </form>
      ))}
    </div>
  );
}

function Notifications({ language, items, onChanged }: { language: string; items: Workspace["notifications"]; onChanged: () => Promise<void> }) {
  return (
    <div className="panel">
      {items.length === 0 && <p>{text(language, "noNotifications")}</p>}
      {items.map((item) => (
        <article key={item.id} className="file-row">
          <div><strong>{item.title}</strong><small>{item.body}</small></div>
          {!item.is_read && <button className="btn btn-ghost" onClick={async () => { await api(`/customer/notifications/${item.id}/read`, { method: "POST" }); await onChanged(); }}>{text(language, "markRead")}</button>}
        </article>
      ))}
    </div>
  );
}

function Settings({ language, onChanged }: { language: string; onChanged: () => Promise<void> }) {
  const [message, setMessage] = useState("");
  return (
    <form className="panel form-grid" onSubmit={async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        await api("/auth/password", {
          method: "POST",
          body: JSON.stringify({ current_password: form.get("current_password"), new_password: form.get("new_password") }),
        });
        setMessage(text(language, "passwordUpdated"));
        await onChanged();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : text(language, "passwordFailed"));
      }
    }}>
      <h2>{text(language, "password")}</h2>
      <label>{text(language, "currentPassword")}<input name="current_password" type="password" required /></label>
      <label>{text(language, "newPassword")}<input name="new_password" type="password" minLength={8} required /></label>
      <button className="btn" type="submit">{text(language, "updatePassword")}</button>
      {message && <p className="form-message">{message}</p>}
      <p>{text(language, "help")}</p>
    </form>
  );
}

export default App;
