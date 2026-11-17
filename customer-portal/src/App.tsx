
import { useState, type FormEvent } from "react";
import "./App.css";

type AuthMode = "home" | "login" | "register" | "forgot";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [mode, setMode] = useState<AuthMode>("home");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    // Registration connects to our FastAPI backend
    if (mode === "register") {
      const password = String(formData.get("password") || "");
      const confirmPassword = String(
        formData.get("confirm_password") || ""
      );

      if (password !== confirmPassword) {
        setMessage("Passwords do not match.");
        return;
      }

      const clientData = {
        company_name: String(formData.get("company_name") || ""),
        registration_number:
          String(formData.get("registration_number") || "") || null,
        country: String(formData.get("country") || ""),
        contact_name: String(formData.get("contact_name") || ""),
        business_email: String(formData.get("business_email") || ""),
        contact_number: String(formData.get("contact_number") || ""),
      };

      try {
        setIsSubmitting(true);

        const response = await fetch(
          `${API_URL}/clients/register`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(clientData),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 409) {
            throw new Error(
              "This email or registration number is already registered."
            );
          }

          if (response.status === 422) {
            throw new Error(
              "Please check your information. Some fields are invalid."
            );
          }

          throw new Error(
            result.detail || "Registration failed. Please try again."
          );
        }

        setMessage(
          `Registration successful! Your Client ID is ${result.id}. Your onboarding status is ${result.onboarding_status}.`
        );

        form.reset();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to connect to the server."
        );
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    if (mode === "login") {
      setMessage(
        "Login is not connected yet. Authentication will be implemented next."
      );
    }

    if (mode === "forgot") {
      setMessage(
        "Password reset is not connected yet. This feature will be implemented later."
      );
    }
  };

  const renderAuthForm = () => {
    if (mode === "home") return null;

    return (
      <div className="auth-card">
        <button
          className="back-button"
          type="button"
          onClick={() => {
            setMode("home");
            setMessage("");
          }}
        >
          ← Back to Home
        </button>

        <h2>
          {mode === "login" && "Welcome Back"}
          {mode === "register" && "Create Your Account"}
          {mode === "forgot" && "Reset Your Password"}
        </h2>

        <p className="auth-description">
          {mode === "login" &&
            "Sign in to continue your business onboarding."}
          {mode === "register" &&
            "Register to begin your corporate banking journey."}
          {mode === "forgot" &&
            "Enter your registered email to request a password reset."}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <label>Company Name</label>
              <input
                name="company_name"
                required
                minLength={2}
                maxLength={200}
                placeholder="Enter registered company name"
              />

              <label>Company Registration Number</label>
              <input
                name="registration_number"
                maxLength={100}
                placeholder="Enter registration number (optional)"
              />

              <label>Country</label>
              <input
                name="country"
                required
                minLength={2}
                maxLength={100}
                placeholder="Enter country of registration"
              />

              <label>Full Name</label>
              <input
                name="contact_name"
                required
                minLength={2}
                maxLength={150}
                placeholder="Enter your full name"
              />

              <label>Mobile Number</label>
              <input
                name="contact_number"
                required
                minLength={7}
                maxLength={30}
                type="tel"
                placeholder="Enter mobile number"
              />
            </>
          )}

          <label>Business Email</label>
          <input
            name="business_email"
            required
            type="email"
            maxLength={255}
            placeholder="name@company.com"
          />

          {mode !== "forgot" && (
            <>
              <label>Password</label>
              <input
                name="password"
                required
                type="password"
                minLength={8}
                placeholder="Enter your password"
              />
            </>
          )}

          {mode === "register" && (
            <>
              <label>Confirm Password</label>
              <input
                name="confirm_password"
                required
                type="password"
                minLength={8}
                placeholder="Confirm your password"
              />
            </>
          )}

          {mode === "login" && (
            <button
              type="button"
              className="forgot-link"
              onClick={() => {
                setMode("forgot");
                setMessage("");
              }}
            >
              Forgot Password?
            </button>
          )}

          <button
            className="submit-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Submitting..."
              : mode === "login"
              ? "Sign In"
              : mode === "register"
              ? "Create Account"
              : "Request Password Reset"}
          </button>
        </form>

        {message && <p className="demo-message">{message}</p>}

        {mode === "login" && (
          <p className="switch-auth">
            New customer?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setMessage("");
              }}
            >
              Register here
            </button>
          </p>
        )}

        {mode === "register" && (
          <p className="switch-auth">
            Already registered?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Sign in
            </button>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="customer-app">
      <header className="customer-header">
        <div className="customer-brand">
          <div className="brand-logo">EC</div>
          <div>
            <h2>Enterprise Connect</h2>
            <span>CORPORATE CLIENT PORTAL</span>
          </div>
        </div>

        <div className="header-actions">
          <button
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
          >
            Customer Login
          </button>

          <button
            className="header-register"
            onClick={() => {
              setMode("register");
              setMessage("");
            }}
          >
            Register
          </button>
        </div>
      </header>

      <main className="customer-main">
        {mode === "home" ? (
          <div className="welcome-section">
            <div className="welcome-content">
              <span className="eyebrow">
                CORPORATE BANKING ONBOARDING
              </span>

              <h1>Your business banking journey starts here.</h1>

              <p>
                A secure and streamlined digital experience to
                establish your corporate banking relationship.
                Register your business, submit KYC documents
                and track your application.
              </p>

              <div className="welcome-actions">
                <button
                  className="primary-action"
                  onClick={() => setMode("register")}
                >
                  Create Your Account →
                </button>

                <button
                  className="secondary-action"
                  onClick={() => setMode("login")}
                >
                  Existing Customer Login
                </button>
              </div>

              <div className="trust-points">
                <span>✓ Secure registration</span>
                <span>✓ Guided onboarding</span>
                <span>✓ Application tracking</span>
              </div>
            </div>

            <div className="journey-card">
              <div className="journey-icon">◆</div>
              <h2>Start Your Corporate Onboarding</h2>
              <p>Complete your registration in a few guided steps.</p>

              <div className="journey-step">
                <span>01</span>
                <div>
                  <strong>Create an Account</strong>
                  <small>Register your business email</small>
                </div>
              </div>

              <div className="journey-step">
                <span>02</span>
                <div>
                  <strong>Business Information</strong>
                  <small>Provide company and ownership details</small>
                </div>
              </div>

              <div className="journey-step">
                <span>03</span>
                <div>
                  <strong>Submit KYC Documents</strong>
                  <small>Upload required business documents</small>
                </div>
              </div>

              <div className="journey-step">
                <span>04</span>
                <div>
                  <strong>Track Your Application</strong>
                  <small>Monitor onboarding progress</small>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="auth-layout">
            <div className="auth-intro">
              <span className="eyebrow">ENTERPRISE CONNECT</span>
              <h1>Your business. Your banking journey.</h1>
              <p>
                Access a secure digital space to manage your
                corporate onboarding application.
              </p>
            </div>

            {renderAuthForm()}
          </div>
        )}
      </main>

      <footer className="customer-footer">
        <p>
          Enterprise Connect · Independent portfolio demonstration
        </p>
        <small>
          Synthetic demonstration environment · Not a live banking service
        </small>
      </footer>
    </div>
  );
}

export default App;
