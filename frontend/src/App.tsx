
import { useEffect, useState } from "react";
import "./App.css";
import ClientOnboarding from "./ClientOnboarding";
import RiskAssessment from "./RiskAssessment";

type Client = {
  id: number;
  company_name: string;
  registration_number: string | null;
  country: string;
  contact_name: string;
  business_email: string;
  contact_number: string;
  onboarding_status: string;
};

const API_URL = "http://127.0.0.1:8000";

const navigation = [
  { name: "Dashboard", icon: "⌂" },
  { name: "Client Onboarding", icon: "＋" },
  { name: "Client Directory", icon: "▤" },
  { name: "Documents", icon: "▧" },
  { name: "KYC & Due Diligence", icon: "◈" },
  { name: "Risk Assessment", icon: "△" },
  { name: "Approvals", icon: "✓" },
  { name: "Reports", icon: "▥" },
  { name: "User Management", icon: "♙" },
  { name: "Settings", icon: "⚙" },
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [searchTerm, setSearchTerm] = useState("");

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // Retrieve client records from FastAPI
  const fetchClients = async () => {
    try {
      setIsLoading(true);
      setApiError("");

      const response = await fetch(`${API_URL}/clients`);

      if (!response.ok) {
        throw new Error("Unable to retrieve client records.");
      }

      const data: Client[] = await response.json();
      setClients(data);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Something went wrong while fetching clients."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Search clients
  const filteredClients = clients.filter((client) =>
    [
      client.id,
      client.company_name,
      client.country,
      client.contact_name,
      client.business_email,
      client.onboarding_status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Dashboard statistics
  const approvedCount = clients.filter(
    (client) => client.onboarding_status === "Approved"
  ).length;

  const reviewCount = clients.filter(
    (client) => client.onboarding_status === "Under Review"
  ).length;

  const pendingCount = clients.filter(
    (client) => client.onboarding_status === "Pending"
  ).length;

  const handleNavigation = (page: string) => {
    setActivePage(page);
    setSearchTerm("");
  };

  // Reusable loading and error messages
  const renderDataMessage = (columnCount: number) => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={columnCount} className="empty-table">
            Loading client records...
          </td>
        </tr>
      );
    }

    if (apiError) {
      return (
        <tr>
          <td colSpan={columnCount} className="empty-table">
            {apiError}
          </td>
        </tr>
      );
    }

    if (filteredClients.length === 0) {
      return (
        <tr>
          <td colSpan={columnCount} className="empty-table">
            No matching client applications found.
          </td>
        </tr>
      );
    }

    return null;
  };

  // Reusable client table
  const renderClientTable = () => (
    <div className="table-wrapper">
      <table className="client-table">
        <thead>
          <tr>
            <th>Client ID</th>
            <th>Client Name</th>
            <th>Country</th>
            <th>Client Type</th>
            <th>Submitted</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {filteredClients.map((client) => (
            <tr key={client.id}>
              <td className="application-id">
                {client.id}
              </td>

              <td className="client-name">
                {client.company_name}
              </td>

              <td>{client.country}</td>

              <td>Corporate</td>

              <td>—</td>

              <td>
                <span
                  className={`status-badge ${client.onboarding_status
                    .toLowerCase()
                    .replaceAll(" ", "-")}`}
                >
                  {client.onboarding_status}
                </span>
              </td>
            </tr>
          ))}

          {renderDataMessage(6)}
        </tbody>
      </table>
    </div>
  );

  // Dashboard
  const renderDashboard = () => (
    <>
      <div className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>
            Welcome to your Enterprise Client Onboarding workspace.
            Here's your onboarding activity overview.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => handleNavigation("Client Onboarding")}
        >
          + Start New Onboarding
        </button>
      </div>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">▤</div>
          <div>
            <p className="stat-label">Total Applications</p>
            <h2>{isLoading ? "..." : clients.length}</h2>
            <span className="stat-caption">Client applications</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">✓</div>
          <div>
            <p className="stat-label">Approved</p>
            <h2>{isLoading ? "..." : approvedCount}</h2>
            <span className="stat-caption">Successfully approved</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">◷</div>
          <div>
            <p className="stat-label">Under Review</p>
            <h2>{isLoading ? "..." : reviewCount}</h2>
            <span className="stat-caption">Currently being reviewed</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">◌</div>
          <div>
            <p className="stat-label">Pending</p>
            <h2>{isLoading ? "..." : pendingCount}</h2>
            <span className="stat-caption">Awaiting action</span>
          </div>
        </div>
      </section>

      <section className="dashboard-panels">
        <div className="panel onboarding-panel">
          <div className="panel-heading">
            <div>
              <h3>Onboarding Overview</h3>
              <p>Monitor your client onboarding workflow.</p>
            </div>
            <span className="panel-tag">Live database</span>
          </div>

          <div className="overview-content">
            <div className="overview-item">
              <span className="overview-dot blue-dot"></span>
              <div>
                <strong>
                  {isLoading ? "..." : clients.length} Applications
                </strong>
                <p>Total applications received</p>
              </div>
            </div>

            <div className="overview-item">
              <span className="overview-dot green-dot"></span>
              <div>
                <strong>{approvedCount} Approved</strong>
                <p>Completed onboarding applications</p>
              </div>
            </div>

            <div className="overview-item">
              <span className="overview-dot orange-dot"></span>
              <div>
                <strong>{reviewCount} Under Review</strong>
                <p>Applications requiring assessment</p>
              </div>
            </div>

            <div className="overview-item">
              <span className="overview-dot purple-dot"></span>
              <div>
                <strong>{pendingCount} Pending</strong>
                <p>Applications awaiting processing</p>
              </div>
            </div>
          </div>

          {apiError && (
            <p className="empty-table">{apiError}</p>
          )}
        </div>

        <div className="panel quick-actions-panel">
          <div className="panel-heading">
            <div>
              <h3>Quick Actions</h3>
              <p>Access frequently used functions.</p>
            </div>
          </div>

          <button
            className="quick-action"
            onClick={() => handleNavigation("Client Onboarding")}
          >
            <span className="quick-action-icon">＋</span>
            <span>
              <strong>New Client Onboarding</strong>
              <small>Register a new corporate client</small>
            </span>
            <span className="action-arrow">›</span>
          </button>

          <button
            className="quick-action"
            onClick={() => handleNavigation("Risk Assessment")}
          >
            <span className="quick-action-icon">△</span>
            <span>
              <strong>Risk Assessment</strong>
              <small>Evaluate client risk indicators</small>
            </span>
            <span className="action-arrow">›</span>
          </button>

          <button
            className="quick-action"
            onClick={() => handleNavigation("Client Directory")}
          >
            <span className="quick-action-icon">▤</span>
            <span>
              <strong>View Client Directory</strong>
              <small>Explore registered clients</small>
            </span>
            <span className="action-arrow">›</span>
          </button>
        </div>
      </section>

      <section className="panel applications-panel">
        <div className="panel-heading applications-heading">
          <div>
            <h3>Recent Client Applications</h3>
            <p>View and search your latest client applications.</p>
          </div>

          <button
            className="secondary-button"
            onClick={() => handleNavigation("Client Directory")}
          >
            View All Clients →
          </button>
        </div>

        <div className="table-toolbar">
          <input
            type="text"
            placeholder="Search by client name, ID, country or status..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        {renderClientTable()}
      </section>
    </>
  );

  // Placeholder for modules not yet developed
  const renderPlaceholder = () => (
    <section className="placeholder-page">
      <div className="placeholder-icon">▤</div>
      <h2>{activePage}</h2>

      <p>
        This module is part of the Enterprise Client Onboarding
        project roadmap.
      </p>

      <span className="panel-tag">Coming soon</span>

      <div className="placeholder-note">
        <strong>Planned functionality</strong>
        <p>
          This section will be developed as the project expands,
          with dedicated workflows, data management and validation.
        </p>
      </div>

      <button
        className="primary-button"
        onClick={() => handleNavigation("Dashboard")}
      >
        Return to Dashboard
      </button>
    </section>
  );

  // Page navigation
  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return renderDashboard();

      case "Client Onboarding":
        return <ClientOnboarding />;

      case "Risk Assessment":
        return <RiskAssessment />;

      case "Client Directory":
        return (
          <section className="panel applications-panel">
            <div className="panel-heading">
              <div>
                <h3>Client Directory</h3>
                <p>Search and review registered clients.</p>
              </div>

              <span className="panel-tag">
                Live database
              </span>
            </div>

            <div className="table-toolbar">
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            {renderClientTable()}
          </section>
        );

      default:
        return renderPlaceholder();
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">EC</div>
          <div className="brand-text">
            <h2>Enterprise</h2>
            <span>CLIENT ONBOARDING</span>
          </div>
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                activePage === item.name ? "active" : ""
              }`}
              onClick={() => handleNavigation(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>

              {activePage === item.name && (
                <span className="nav-active-indicator"></span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-security">
          <div className="security-icon">◆</div>
          <div>
            <strong>Secure Workspace</strong>
            <span>Independent portfolio demo</span>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">
            <span className="environment-label">
              <span className="environment-dot"></span>
              DEMO ENVIRONMENT
            </span>

            <div className="user-profile">
              <div className="user-avatar">AD</div>
              <div className="user-details">
                <strong>Administrator</strong>
                <span>Demo User</span>
              </div>
            </div>
          </div>
        </header>

        <main className="dashboard-content">
          {renderPage()}
        </main>

        <footer className="app-footer">
          Enterprise Client Onboarding · Independent portfolio project
          <span> | Synthetic demonstration data only</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
