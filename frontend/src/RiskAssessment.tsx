
import { useState } from 'react';

type RiskLevel = 'Low' | 'Medium' | 'High';

function RiskAssessment() {
  const [countryRisk, setCountryRisk] = useState('Low');
  const [businessRisk, setBusinessRisk] = useState('Low');
  const [ownershipRisk, setOwnershipRisk] = useState('Low');
  const [pepStatus, setPepStatus] = useState('No');
  const [sanctionsStatus, setSanctionsStatus] = useState('No');
  const [notes, setNotes] = useState('');

  const riskPoints: Record<string, number> = {
    Low: 5,
    Medium: 15,
    High: 25,
  };

  const pepPoints = pepStatus === 'Yes' ? 20 : 0;
  const sanctionsPoints = sanctionsStatus === 'Yes' ? 40 : 0;

  const totalScore =
    riskPoints[countryRisk] +
    riskPoints[businessRisk] +
    riskPoints[ownershipRisk] +
    pepPoints +
    sanctionsPoints;

  const riskLevel: RiskLevel =
    sanctionsStatus === 'Yes' || totalScore >= 60
      ? 'High'
      : totalScore >= 30
      ? 'Medium'
      : 'Low';

  const recommendation =
    sanctionsStatus === 'Yes'
      ? 'Escalate immediately for specialist compliance review. Do not approve automatically.'
      : pepStatus === 'Yes' || riskLevel === 'High'
      ? 'Enhanced due diligence and senior compliance review recommended.'
      : riskLevel === 'Medium'
      ? 'Additional checks and compliance review recommended before approval.'
      : 'Standard due diligence. Continue with the normal review process.';

  const handleReset = () => {
    setCountryRisk('Low');
    setBusinessRisk('Low');
    setOwnershipRisk('Low');
    setPepStatus('No');
    setSanctionsStatus('No');
    setNotes('');
  };

  return (
    <div className="risk-page">
      <div className="breadcrumb">
        WORKSPACE / RISK ASSESSMENT
      </div>

      <section className="risk-heading">
        <div>
          <div className="welcome-label">COMPLIANCE / CUSTOMER RISK</div>
          <h1>Risk Assessment</h1>
          <p>
            Evaluate customer risk factors and determine the recommended
            due diligence approach.
          </p>
        </div>

        <span className="risk-demo-label">DEMO ASSESSMENT</span>
      </section>

      <section className="risk-summary-grid">
        <article className="risk-summary-card">
          <span>Overall Risk Score</span>
          <strong>{totalScore} / 135</strong>
          <small>Calculated from the selected indicators</small>
        </article>

        <article className="risk-summary-card">
          <span>Risk Classification</span>
          <strong className={`risk-level ${riskLevel.toLowerCase()}`}>
            {riskLevel}
          </strong>
          <small>Based on the demonstration scoring rules</small>
        </article>

        <article className="risk-summary-card">
          <span>Review Status</span>
          <strong className="review-required">Review Required</strong>
          <small>Automated score is not an approval decision</small>
        </article>
      </section>

      <section className="risk-card">
        <div className="risk-card-heading">
          <h2>Customer Risk Factors</h2>
          <p>
            Select the appropriate demonstration risk level for each category.
          </p>
        </div>

        <div className="risk-form-grid">
          <div className="risk-field">
            <label htmlFor="countryRisk">1. Country Risk</label>
            <select
              id="countryRisk"
              value={countryRisk}
              onChange={(event) => setCountryRisk(event.target.value)}
            >
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
            </select>
            <small>
              Illustrative assessment of the customer's country exposure.
            </small>
          </div>

          <div className="risk-field">
            <label htmlFor="businessRisk">2. Business Activity Risk</label>
            <select
              id="businessRisk"
              value={businessRisk}
              onChange={(event) => setBusinessRisk(event.target.value)}
            >
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
            </select>
            <small>
              Consider the nature and complexity of the business activity.
            </small>
          </div>

          <div className="risk-field">
            <label htmlFor="ownershipRisk">3. Ownership and Control Risk</label>
            <select
              id="ownershipRisk"
              value={ownershipRisk}
              onChange={(event) => setOwnershipRisk(event.target.value)}
            >
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
            </select>
            <small>
              Consider transparency of ownership and control arrangements.
            </small>
          </div>

          <div className="risk-field">
            <label htmlFor="pepStatus">
              4. Politically Exposed Person (PEP)
            </label>
            <select
              id="pepStatus"
              value={pepStatus}
              onChange={(event) => setPepStatus(event.target.value)}
            >
              <option value="No">No identified PEP indicator</option>
              <option value="Yes">Yes - PEP indicator identified</option>
            </select>
            <small>
              This is a demonstration indicator, not a live screening result.
            </small>
          </div>

          <div className="risk-field">
            <label htmlFor="sanctionsStatus">5. Sanctions Indicator</label>
            <select
              id="sanctionsStatus"
              value={sanctionsStatus}
              onChange={(event) => setSanctionsStatus(event.target.value)}
            >
              <option value="No">No identified sanctions indicator</option>
              <option value="Yes">Yes - Potential match identified</option>
            </select>
            <small>
              A potential match requires investigation; it is not proof of
              a sanctions designation.
            </small>
          </div>

          <div className="risk-field">
            <label htmlFor="riskNotes">Assessment Notes</label>
            <textarea
              id="riskNotes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Enter the reasons for the selected risk levels..."
              rows={4}
            />
            <small>Record the rationale for the assessment.</small>
          </div>
        </div>
      </section>

      <section className="risk-card">
        <div className="risk-card-heading">
          <h2>Risk Assessment Result</h2>
          <p>The result updates automatically when you change an indicator.</p>
        </div>

        <div className="risk-result">
          <div>
            <span className="result-label">Calculated Score</span>
            <strong>{totalScore} / 135</strong>
          </div>

          <div>
            <span className="result-label">Risk Category</span>
            <strong className={`risk-level ${riskLevel.toLowerCase()}`}>
              {riskLevel} Risk
            </strong>
          </div>
        </div>

        <div className="risk-score-breakdown">
          <h3>Score Breakdown</h3>

          <div className="score-row">
            <span>Country Risk</span>
            <strong>{riskPoints[countryRisk]} points</strong>
          </div>

          <div className="score-row">
            <span>Business Activity Risk</span>
            <strong>{riskPoints[businessRisk]} points</strong>
          </div>

          <div className="score-row">
            <span>Ownership and Control Risk</span>
            <strong>{riskPoints[ownershipRisk]} points</strong>
          </div>

          <div className="score-row">
            <span>PEP Indicator</span>
            <strong>{pepPoints} points</strong>
          </div>

          <div className="score-row">
            <span>Sanctions Indicator</span>
            <strong>{sanctionsPoints} points</strong>
          </div>

          <div className="score-total">
            <span>Total Risk Score</span>
            <strong>{totalScore} points</strong>
          </div>
        </div>

        <div className="recommendation-panel">
          <h3>Compliance Recommendation</h3>
          <p>{recommendation}</p>
        </div>

        <div className="risk-actions">
          <button className="secondary-button" onClick={handleReset}>
            Reset Assessment
          </button>

          <button
            className="primary-button"
            onClick={() =>
              window.alert(
                'Demo assessment calculated. Backend saving and compliance approval will be implemented in a later development stage.'
              )
            }
          >
            Save Assessment
          </button>
        </div>

        <p className="risk-disclaimer">
          Demonstration only. The scoring thresholds and weights are illustrative,
          not a regulatory standard. A qualified compliance reviewer must
          independently assess the customer. This page does not perform live
          PEP or sanctions screening and does not save assessments to a backend.
        </p>
      </section>
    </div>
  );
}

export default RiskAssessment;
