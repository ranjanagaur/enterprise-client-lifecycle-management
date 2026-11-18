import { useEffect, useState, type FormEvent } from "react";
import "./App.css";
import "./review.css";
import { api, getToken, openDocument, setToken } from "./api";

type Page = "Dashboard" | "Applications" | "Review";

type Summary = {
  total: number;
  pending: number;
  submitted: number;
  under_review: number;
  information_required: number;
  approved: number;
  rejected: number;
  activity: { id: number; event: string; detail: string | null }[];
};

type ApplicationRow = {
  id: number;
  reference: string;
  legal_name: string;
  country: string;
  registration_number: string | null;
  email: string;
  status: string;
  risk: string;
  outstanding: number;
};

type Detail = {
  application: { id: number; reference: string; status: string };
  organisation: Record<string, string | null>;
  questionnaire: {
    response_status: string;
    sections: { title: string; questions: { prompt: string; answer: string; required: boolean }[] }[];
  };
  documents: {
    id: number;
    description: string | null;
    status: string;
    feedback: string | null;
    versions: { id: number; version_number: number; filename: string }[];
  }[];
  parties: { full_name: string; party_type: string; ownership_percentage: string | null }[];
  requests: { id: number; reference: string; description: string; status: string; due_date: string | null }[];
  risk: { score: number; level: string; methodology: string; notes: string | null }[];
  audit: { id: number; event: string; detail: string | null; created_at: string | null }[];
};

const navigation: Page[] = ["Dashboard", "Applications"];

function App() {
  const [token, setTokenState] = useState(getToken());
  const [page, setPage] = useState<Page>("Dashboard");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");

  const loadLists = async () => {
    const [dash, applications] = await Promise.all([
      api<Summary>("/employee/dashboard"),
      api<ApplicationRow[]>(`/employee/applications?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`),
    ]);
    setSummary(dash);
    setRows(applications);
  };

  useEffect(() => {
    if (!token) return;
    loadLists().catch((reason: Error) => setError(reason.message));
  }, [token, search, status]);

  useEffect(() => {
    if (!selected) return;
    api<Detail>(`/employee/applications/${selected}`)
      .then(setDetail)
      .catch((reason: Error) => setError(reason.message));
  }, [selected]);

  const openApplication = (id: number) => {
    setSelected(id);
    setPage("Review");
  };

  if (!token) {
    return (
      <div className="gate">
        <aside className="gate-brand">
          <div className="brand">
            <span className="mark">E</span>
            <div>
              <strong>Enterprise Connect</strong>
              <small>Employee portal</small>
            </div>
          </div>
          <div>
            <h1>Review the client book</h1>
            <p>Open an application, read the documents, and record the demonstration risk assessment.</p>
          </div>
        </aside>
        <main className="gate-panel">
          <form className="auth-card" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setError("");
            try {
              const result = await api<{ access_token: string; user: { portal_role: string } }>("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
              });
              if (result.user.portal_role !== "employee") {
                setError("This sign-in is for the employee portal.");
                return;
              }
              setToken(result.access_token);
              setTokenState(result.access_token);
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : "Sign in failed.");
            }
          }}>
            <h2>Sign in</h2>
            <p className="lede">Employee access only. Synthetic demonstration data.</p>
            <label>Email<input name="email" type="email" required /></label>
            <label>Password<input name="password" type="password" required minLength={8} /></label>
            <button className="primary-button" type="submit">Sign in</button>
            {error && <p className="form-message">{error}</p>}
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell employee">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark">E</span>
          <div className="brand-name">
            <strong>Enterprise Connect</strong>
            <small>Employee portal</small>
          </div>
        </div>
        <nav className="side-navigation">
          <div className="side-label">Workspace</div>
          {navigation.map((item) => (
            <button key={item} className={`nav-item ${page === item ? "active" : ""}`} onClick={() => setPage(item)}>
              <span>{item}</span>
            </button>
          ))}
          {selected && (
            <button className={`nav-item ${page === "Review" ? "active" : ""}`} onClick={() => setPage("Review")}>
              <span>Open application</span>
            </button>
          )}
        </nav>
        <div className="side-user">
          <span className="avatar">DR</span>
          <div>
            <strong>Demo reviewer</strong>
            <button className="btn-text" onClick={async () => {
              await api("/auth/logout", { method: "POST" }).catch(() => undefined);
              setToken(null);
              setTokenState(null);
            }}>Sign out</button>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div>
            <span className="crumb">Review desk</span>
            <strong>{page === "Review" ? "Open application" : page}</strong>
          </div>
        </header>
        <main className="dashboard-content">
          {error && <p className="form-message">{error}</p>}
          {page === "Dashboard" && summary && (
            <>
              <div className="page-head">
                <h1>Overview</h1>
                <p>The synthetic client book currently in review.</p>
              </div>
              <section className="stats-grid">
                <Card label="Applications" value={summary.total} />
                <Card label="Not submitted" value={summary.pending} />
                <Card label="Submitted" value={summary.submitted} />
                <Card label="Under review" value={summary.under_review} />
                <Card label="Information required" value={summary.information_required} />
                <Card label="Approved" value={summary.approved} />
                <Card label="Rejected" value={summary.rejected} />
              </section>
              <section className="panel">
                <div className="panel-heading"><h3>Recent activity</h3></div>
                {summary.activity.map((item) => (
                  <p key={item.id}><strong>{item.event.replaceAll("_", " ")}</strong> {item.detail}</p>
                ))}
                <div className="bar-chart">
                  {(() => {
                    const bars = [
                      ["Pending", summary.pending],
                      ["Submitted", summary.submitted],
                      ["Review", summary.under_review],
                      ["Approved", summary.approved],
                    ];
                    const max = Math.max(1, ...bars.map(([, value]) => Number(value)));
                    return bars.map(([label, value]) => (
                      <div key={String(label)}>
                        <span style={{ height: `${Math.max(4, (Number(value) / max) * 72)}px` }} />
                        <small>{label}</small>
                      </div>
                    ));
                  })()}
                </div>
              </section>
            </>
          )}
          {page === "Applications" && (
            <section className="panel">
              <div className="page-head">
                <h1>Applications</h1>
                <p>{rows.length} records in the client book.</p>
              </div>
              <div className="filters">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search organisation, reference, or email" />
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="">All statuses</option>
                  {["Pending", "Draft", "Submitted", "Under Review", "Information Required", "Resubmitted", "Approved", "Rejected"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
              <table className="client-table">
                <thead>
                  <tr>
                    <th>Reference</th><th>Organisation</th><th>Country</th><th>Status</th><th>Risk</th><th>Open items</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} onClick={() => openApplication(row.id)}>
                      <td>{row.reference}</td>
                      <td>{row.legal_name}</td>
                      <td>{row.country}</td>
                      <td>{row.status}</td>
                      <td>{row.risk}</td>
                      <td>{row.outstanding}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          {page === "Review" && detail && (
            <Review
              detail={detail}
              onChanged={async () => {
                await loadLists();
                setDetail(await api<Detail>(`/employee/applications/${detail.application.id}`));
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <article className="stat-card">
      <p className="stat-label">{label}</p>
      <h2>{value}</h2>
    </article>
  );
}

function Review({ detail, onChanged }: { detail: Detail; onChanged: () => Promise<void> }) {
  const organisation = detail.organisation;
  const [tab, setTab] = useState("Profile");
  const [message, setMessage] = useState("");
  const tabs = ["Profile", "Questionnaire", "Documents", "People", "Requests", "Risk", "History"];

  return (
    <section className="review">
      <div className="review-head">
        <div>
          <p className="eyebrow">{detail.application.reference}</p>
          <h1>{organisation.legal_name}</h1>
        </div>
        <form onSubmit={async (event) => {
          event.preventDefault();
          const status = String(new FormData(event.currentTarget).get("status"));
          await api(`/employee/applications/${detail.application.id}/status`, { method: "POST", body: JSON.stringify({ status }) });
          await onChanged();
        }}>
          <select name="status" defaultValue={detail.application.status}>
            {["Pending", "Draft", "Submitted", "Under Review", "Information Required", "Resubmitted", "Approved", "Rejected"].map((item) => <option key={item}>{item}</option>)}
          </select>
          <button className="primary-button" type="submit">Update status</button>
        </form>
      </div>
      <div className="tabs">
        {tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}
      </div>
      {tab === "Profile" && (
        <div className="panel detail-grid">
          {Object.entries(organisation).map(([key, value]) => (
            <p key={key}><span>{key.replaceAll("_", " ")}</span><strong>{value || "—"}</strong></p>
          ))}
        </div>
      )}
      {tab === "Questionnaire" && (
        <div className="panel">
          <p>Submitted answers are read-only. Status: {detail.questionnaire.response_status}. English prompts are shown for review.</p>
          {detail.questionnaire.sections.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              {section.questions.map((question) => (
                <p key={question.prompt}><span>{question.prompt}</span><strong>{question.answer || "No answer"}</strong></p>
              ))}
            </section>
          ))}
        </div>
      )}
      {tab === "Documents" && (
        <div className="panel">
          {detail.documents.map((document) => (
            <article key={document.id} className="file-row">
              <div>
                <strong>{document.description || document.versions[0]?.filename}</strong>
                <small>{document.status}{document.feedback ? ` · ${document.feedback}` : ""}</small>
              </div>
              {document.versions[0] && (
                <div className="row-actions">
                  <button type="button" onClick={() => openDocument(document.versions[0].id)}>Preview</button>
                  <form onSubmit={async (event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    await api(`/employee/documents/${document.versions[0].id}/review`, {
                      method: "POST",
                      body: JSON.stringify({ outcome: form.get("outcome"), comment: form.get("comment") }),
                    });
                    await onChanged();
                  }}>
                    <select name="outcome">
                      <option>Verified</option>
                      <option>Rejected</option>
                      <option>Replacement Requested</option>
                    </select>
                    <input name="comment" placeholder="Comment" />
                    <button className="primary-button" type="submit">Save review</button>
                  </form>
                </div>
              )}
            </article>
          ))}
          {detail.documents.length === 0 && <p>No documents uploaded.</p>}
        </div>
      )}
      {tab === "People" && (
        <div className="panel">
          {detail.parties.map((person) => <p key={person.full_name}><strong>{person.full_name}</strong> {person.party_type} {person.ownership_percentage || ""}</p>)}
          {detail.parties.length === 0 && <p>No directors, owners, or controllers recorded.</p>}
        </div>
      )}
      {tab === "Requests" && (
        <div className="panel">
          <form onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await api(`/employee/applications/${detail.application.id}/requests`, {
              method: "POST",
              body: JSON.stringify({
                description: form.get("description"),
                related_type: form.get("related_type"),
                due_date: form.get("due_date") || null,
              }),
            });
            event.currentTarget.reset();
            await onChanged();
          }}>
            <textarea name="description" required placeholder="What should the customer provide?" />
            <select name="related_type">
              <option value="document">Document</option>
              <option value="questionnaire">Questionnaire</option>
              <option value="profile">Profile</option>
            </select>
            <input type="date" name="due_date" />
            <button className="primary-button" type="submit">Send request</button>
          </form>
          {detail.requests.map((request) => (
            <article key={request.id}>
              <strong>{request.reference}</strong> {request.status}
              <p>{request.description}</p>
              {request.status !== "Closed" && <button onClick={async () => { await api(`/employee/requests/${request.id}/close`, { method: "POST" }); await onChanged(); }}>Close</button>}
            </article>
          ))}
        </div>
      )}
      {tab === "Risk" && (
        <form className="panel" onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const result = await api<{ score: number; level: string }>(`/employee/applications/${detail.application.id}/risk`, {
            method: "POST",
            body: JSON.stringify(Object.fromEntries(form.entries())),
          });
          setMessage(`Demonstration result: ${result.score}, ${result.level}. This is not an approved risk methodology.`);
          await onChanged();
        }}>
          <p>Demonstration rule only. It does not connect to a sanctions or screening service.</p>
          {["country_risk", "business_risk", "ownership_risk"].map((name) => (
            <label key={name}>{name.replaceAll("_", " ")}
              <select name={name}><option>Low</option><option>Medium</option><option>High</option></select>
            </label>
          ))}
          <label>PEP<select name="pep_status"><option>No</option><option>Yes</option></select></label>
          <label>Sanctions indicator<select name="sanctions_status"><option>No</option><option>Yes</option></select></label>
          <textarea name="notes" placeholder="Review note" />
          <button className="primary-button" type="submit">Save assessment</button>
          {detail.risk[0] && <p>Latest: {detail.risk[0].score} / {detail.risk[0].level} ({detail.risk[0].methodology})</p>}
          {message && <p>{message}</p>}
        </form>
      )}
      {tab === "History" && (
        <div className="panel">
          {detail.audit.map((item) => <p key={item.id}><strong>{item.event.replaceAll("_", " ")}</strong> {item.detail}</p>)}
        </div>
      )}
    </section>
  );
}

export default App;
