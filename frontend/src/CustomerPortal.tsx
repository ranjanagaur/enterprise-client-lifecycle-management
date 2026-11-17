import "./CustomerPortal.css";
function CustomerPortal() {
  return (
    <div className="customer-portal">
      <header className="customer-header">
        <div className="customer-brand">
          <div className="customer-logo">EC</div>
          <div>
            <h2>Enterprise Connect</h2>
            <span>SECURE CLIENT ONBOARDING</span>
          </div>
        </div>

        <button className="customer-login-button">
          Existing Customer Login
        </button>
      </header>

      <main className="customer-hero">
        <div className="customer-hero-content">
          <span className="customer-eyebrow">
            CORPORATE BANKING ONBOARDING
          </span>

          <h1>
            Your business journey
            <br />
            starts with us.
          </h1>

          <p>
            A simple and secure way to begin your corporate
            banking relationship. Submit your business
            information and documents through our digital
            onboarding experience.
          </p>

          <button className="customer-start-button">
            Start Your Application →
          </button>

          <div className="customer-features">
            <span>✓ Secure submission</span>
            <span>✓ Guided registration</span>
            <span>✓ Application tracking</span>
          </div>
        </div>

        <div className="customer-hero-card">
          <div className="customer-card-icon">◆</div>

          <h3>Corporate Client Registration</h3>
          <p>Begin your onboarding journey in a few simple steps.</p>

          <div className="customer-step">
            <span>01</span>
            <div>
              <strong>Business Information</strong>
              <small>Tell us about your company</small>
            </div>
          </div>

          <div className="customer-step">
            <span>02</span>
            <div>
              <strong>Key Individuals</strong>
              <small>Add directors and owners</small>
            </div>
          </div>

          <div className="customer-step">
            <span>03</span>
            <div>
              <strong>Document Submission</strong>
              <small>Upload required documents</small>
            </div>
          </div>
        </div>
      </main>

      <footer className="customer-footer">
        Enterprise Connect · Independent portfolio demonstration
      </footer>
    </div>
  );
}

export default CustomerPortal;
