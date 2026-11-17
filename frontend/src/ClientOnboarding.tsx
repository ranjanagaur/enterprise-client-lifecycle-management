
import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import './ClientOnboarding.css';

type Person = {
  id: number;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
  identificationNumber: string;
  appointmentDate: string;
  ownershipPercentage: string;
  countryOfResidence: string;
  natureOfControl: string;
  isPEP: string;
};

type KycDocument = {
  id: number;
  name: string;
  fileName: string;
  expiryDate: string;
  status: string;
};

type OnboardingData = {
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  country: string;
  entityType: string;
  incorporationDate: string;

  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  addressCountry: string;
  website: string;

  directors: Person[];
  beneficialOwners: Person[];

  primaryContactName: string;
  designation: string;
  email: string;
  phone: string;
  alternateContactName: string;
  alternateEmail: string;
  alternatePhone: string;
  preferredCommunication: string;
  correspondenceAddress: string;

  documents: KycDocument[];
};

const STORAGE_KEY = 'enterprise_client_onboarding_draft';

const createPerson = (): Person => ({
  id: Date.now() + Math.floor(Math.random() * 100000),
  fullName: '',
  dateOfBirth: '',
  nationality: '',
  address: '',
  identificationNumber: '',
  appointmentDate: '',
  ownershipPercentage: '',
  countryOfResidence: '',
  natureOfControl: '',
  isPEP: '',
});

const initialDocuments: KycDocument[] = [
  {
    id: 1,
    name: 'Certificate of Incorporation',
    fileName: '',
    expiryDate: '',
    status: 'Pending',
  },
  {
    id: 2,
    name: 'Memorandum and Articles of Association',
    fileName: '',
    expiryDate: '',
    status: 'Pending',
  },
  {
    id: 3,
    name: 'Proof of Registered Address',
    fileName: '',
    expiryDate: '',
    status: 'Pending',
  },
  {
    id: 4,
    name: 'Director Identity Documents',
    fileName: '',
    expiryDate: '',
    status: 'Pending',
  },
  {
    id: 5,
    name: 'Beneficial Owner Identity Documents',
    fileName: '',
    expiryDate: '',
    status: 'Pending',
  },
  {
    id: 6,
    name: 'Ownership Structure Chart',
    fileName: '',
    expiryDate: '',
    status: 'Pending',
  },
  {
    id: 7,
    name: 'Proof of Business Activity',
    fileName: '',
    expiryDate: '',
    status: 'Pending',
  },
];

const emptyForm: OnboardingData = {
  legalName: '',
  tradingName: '',
  registrationNumber: '',
  country: '',
  entityType: '',
  incorporationDate: '',

  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  addressCountry: '',
  website: '',

  directors: [createPerson()],
  beneficialOwners: [createPerson()],

  primaryContactName: '',
  designation: '',
  email: '',
  phone: '',
  alternateContactName: '',
  alternateEmail: '',
  alternatePhone: '',
  preferredCommunication: '',
  correspondenceAddress: '',

  documents: initialDocuments.map((document) => ({ ...document })),
};

const stepNames = [
  'Company Information',
  'Registered Office Address',
  'Directors & Beneficial Owners',
  'Contact Information',
  'KYC Documents',
];

function ClientOnboarding() {
  const [formData, setFormData] = useState<OnboardingData>(emptyForm);
  const [currentStep, setCurrentStep] = useState(1);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] =
    useState<'success' | 'error'>('success');

  // Restore the saved application when the component loads.
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);

      if (savedData) {
        const parsedData = JSON.parse(savedData);

        setFormData({
          ...emptyForm,
          ...parsedData,
          directors: parsedData.directors?.length
            ? parsedData.directors
            : [createPerson()],
          beneficialOwners: parsedData.beneficialOwners?.length
            ? parsedData.beneficialOwners
            : [createPerson()],
          documents: parsedData.documents?.length
            ? parsedData.documents
            : initialDocuments.map((document) => ({ ...document })),
        });

        setMessage('Your previous draft has been restored.');
      }
    } catch {
      setMessage('Unable to restore your previous draft.');
      setMessageType('error');
    }
  }, []);

  // Update ordinary form fields.
  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage('');
  };

  // Update director and beneficial owner fields.
  const handlePersonChange = (
    group: 'directors' | 'beneficialOwners',
    id: number,
    field: keyof Person,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      [group]: previous[group].map((person) =>
        person.id === id ? { ...person, [field]: value } : person
      ),
    }));

    setMessage('');
  };

  // Add another director or beneficial owner.
  const addPerson = (
    group: 'directors' | 'beneficialOwners'
  ) => {
    setFormData((previous) => ({
      ...previous,
      [group]: [...previous[group], createPerson()],
    }));

    setMessage('');
  };

  // Remove a director or beneficial owner.
  const removePerson = (
    group: 'directors' | 'beneficialOwners',
    id: number
  ) => {
    if (formData[group].length <= 1) {
      setMessage('At least one record must remain in this section.');
      setMessageType('error');
      return;
    }

    setFormData((previous) => ({
      ...previous,
      [group]: previous[group].filter((person) => person.id !== id),
    }));

    setMessage('Record removed.');
    setMessageType('success');
  };

  // Select a document and update its checklist status.
  const handleDocumentUpload = (
    id: number,
    file: File | undefined
  ) => {
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage('Please select a PDF, JPG or PNG file.');
      setMessageType('error');
      return;
    }

    const maximumSize = 5 * 1024 * 1024;

    if (file.size > maximumSize) {
      setMessage('Please select a file smaller than 5 MB.');
      setMessageType('error');
      return;
    }

    setFormData((previous) => ({
      ...previous,
      documents: previous.documents.map((document) =>
        document.id === id
          ? {
              ...document,
              fileName: file.name,
              status: 'Uploaded',
            }
          : document
      ),
    }));

    setMessage(
      'Document selected. Save your draft to retain its checklist details.'
    );
    setMessageType('success');
  };

  // Update a document expiry date.
  const handleDocumentExpiry = (
    id: number,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      documents: previous.documents.map((document) =>
        document.id === id
          ? { ...document, expiryDate: value }
          : document
      ),
    }));

    setMessage('');
  };

  // Save the complete application to browser storage.
  const saveDraft = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(formData)
      );

      setMessage('Draft saved successfully in this browser.');
      setMessageType('success');
    } catch {
      setMessage('Unable to save your draft. Please try again.');
      setMessageType('error');
    }
  };

  // Continue to the next section.
  const handleContinue = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(formData)
      );

      if (currentStep < 5) {
        setCurrentStep((previous) => previous + 1);
        setMessage('Your information has been saved successfully.');
      } else {
        setMessage(
          'KYC document checklist saved. The first five sections are complete.'
        );
      }

      setMessageType('success');
    } catch {
      setMessage('Unable to save your information.');
      setMessageType('error');
    }
  };

  // Go back one step.
  const handlePrevious = () => {
    setCurrentStep((previous) => Math.max(1, previous - 1));
    setMessage('');
  };

  // Reusable director and beneficial owner form.
  const renderPersonFields = (
    person: Person,
    group: 'directors' | 'beneficialOwners'
  ) => {
    const isDirector = group === 'directors';

    return (
      <div className="person-card" key={person.id}>
        <div className="person-card-heading">
          <strong>
            {isDirector ? 'Director' : 'Beneficial Owner'}
          </strong>

          <button
            type="button"
            className="secondary-button"
            onClick={() => removePerson(group, person.id)}
          >
            Remove
          </button>
        </div>

        <div className="form-grid">
          <label>
            Full Legal Name *
            <input
              value={person.fullName}
              onChange={(event) =>
                handlePersonChange(
                  group,
                  person.id,
                  'fullName',
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            Date of Birth *
            <input
              type="date"
              value={person.dateOfBirth}
              onChange={(event) =>
                handlePersonChange(
                  group,
                  person.id,
                  'dateOfBirth',
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            Nationality *
            <input
              value={person.nationality}
              onChange={(event) =>
                handlePersonChange(
                  group,
                  person.id,
                  'nationality',
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            Country of Residence *
            <input
              value={person.countryOfResidence}
              onChange={(event) =>
                handlePersonChange(
                  group,
                  person.id,
                  'countryOfResidence',
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            Residential Address *
            <input
              value={person.address}
              onChange={(event) =>
                handlePersonChange(
                  group,
                  person.id,
                  'address',
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            Identification Number
            <input
              value={person.identificationNumber}
              onChange={(event) =>
                handlePersonChange(
                  group,
                  person.id,
                  'identificationNumber',
                  event.target.value
                )
              }
            />
          </label>

          {isDirector ? (
            <label>
              Appointment Date *
              <input
                type="date"
                value={person.appointmentDate}
                onChange={(event) =>
                  handlePersonChange(
                    group,
                    person.id,
                    'appointmentDate',
                    event.target.value
                  )
                }
                required
              />
            </label>
          ) : (
            <>
              <label>
                Ownership Percentage *
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={person.ownershipPercentage}
                  onChange={(event) =>
                    handlePersonChange(
                      group,
                      person.id,
                      'ownershipPercentage',
                      event.target.value
                    )
                  }
                  required
                />
              </label>

              <label>
                Nature of Control *
                <select
                  value={person.natureOfControl}
                  onChange={(event) =>
                    handlePersonChange(
                      group,
                      person.id,
                      'natureOfControl',
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="">Select nature of control</option>
                  <option value="Share ownership">Share ownership</option>
                  <option value="Voting rights">Voting rights</option>
                  <option value="Right to appoint directors">
                    Right to appoint directors
                  </option>
                  <option value="Other significant control">
                    Other significant control
                  </option>
                </select>
              </label>
            </>
          )}

          <label>
            Politically Exposed Person (PEP)? *
            <select
              value={person.isPEP}
              onChange={(event) =>
                handlePersonChange(
                  group,
                  person.id,
                  'isPEP',
                  event.target.value
                )
              }
              required
            >
              <option value="">Select response</option>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
              <option value="Unknown">Not yet confirmed</option>
            </select>
          </label>
        </div>
      </div>
    );
  };

  const uploadedCount = formData.documents.filter(
    (document) => document.status === 'Uploaded'
  ).length;

  const progressPercentage =
    (uploadedCount / formData.documents.length) * 100;

  return (
    <div className="onboarding-page">
      <div className="onboarding-heading">
        <div>
          <span className="section-label">
            CLIENT MANAGEMENT / REGISTRATION
          </span>

          <h1>New Client Application</h1>

          <p>
            Complete the details below to initiate client onboarding.
          </p>
        </div>

        <span className="draft-status">Draft Application</span>
      </div>

      {/* PROGRESS INDICATOR */}
      <div
        className="onboarding-card"
        style={{ marginBottom: '20px' }}
      >
        <div className="form-grid">
          {stepNames.map((name, index) => {
            const step = index + 1;

            return (
              <div key={step}>
                <strong
                  style={{
                    color:
                      step === currentStep
                        ? '#1876a8'
                        : step < currentStep
                          ? '#20856a'
                          : '#8796a2',
                  }}
                >
                  {step < currentStep
                    ? '✓'
                    : step === currentStep
                      ? '●'
                      : '○'}{' '}
                  Step {step}
                </strong>

                <p>{name}</p>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleContinue}>
        <div className="onboarding-card">

          {/* STEP 1: COMPANY INFORMATION */}
          {currentStep === 1 && (
            <>
              <h2>Company Information</h2>
              <p>Enter the organisation's registered details.</p>

              <div className="form-grid">
                <label>
                  Legal Company Name *
                  <input
                    name="legalName"
                    value={formData.legalName}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Trading Name
                  <input
                    name="tradingName"
                    value={formData.tradingName}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Company Registration Number *
                  <input
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Country of Incorporation *
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select country</option>
                    <option>United Kingdom</option>
                    <option>India</option>
                    <option>Singapore</option>
                    <option>United Arab Emirates</option>
                    <option>United States</option>
                    <option>Other</option>
                  </select>
                </label>

                <label>
                  Legal Entity Type *
                  <select
                    name="entityType"
                    value={formData.entityType}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select entity type</option>
                    <option>Private Limited Company</option>
                    <option>Public Limited Company</option>
                    <option>Partnership</option>
                    <option>Limited Liability Partnership</option>
                    <option>Sole Trader</option>
                    <option>Other</option>
                  </select>
                </label>

                <label>
                  Date of Incorporation
                  <input
                    type="date"
                    name="incorporationDate"
                    value={formData.incorporationDate}
                    onChange={handleChange}
                  />
                </label>
              </div>
            </>
          )}

          {/* STEP 2: REGISTERED ADDRESS */}
          {currentStep === 2 && (
            <>
              <h2>Registered Office Address</h2>
              <p>
                Enter the official registered address of the organisation.
              </p>

              <div className="form-grid">
                <label>
                  Address Line 1 *
                  <input
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Address Line 2
                  <input
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  City / Town *
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  State / Province
                  <input
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Postal Code *
                  <input
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Country *
                  <select
                    name="addressCountry"
                    value={formData.addressCountry}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select country</option>
                    <option>United Kingdom</option>
                    <option>India</option>
                    <option>Singapore</option>
                    <option>United Arab Emirates</option>
                    <option>United States</option>
                    <option>Other</option>
                  </select>
                </label>

                <label>
                  Company Website
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://www.example.com"
                  />
                </label>
              </div>
            </>
          )}

          {/* STEP 3: DIRECTORS AND BENEFICIAL OWNERS */}
          {currentStep === 3 && (
            <>
              <h2>Directors and Beneficial Owners</h2>

              <p>
                Identify the individuals responsible for managing,
                owning or controlling the organisation.
              </p>

              <div style={{ marginTop: '25px' }}>
                <h3>A. Directors</h3>

                {formData.directors.map((person) =>
                  renderPersonFields(person, 'directors')
                )}

                <button
                  type="button"
                  className="secondary-button"
                  style={{ marginTop: '15px' }}
                  onClick={() => addPerson('directors')}
                >
                  + Add Another Director
                </button>
              </div>

              <div style={{ marginTop: '35px' }}>
                <h3>B. Beneficial Owners</h3>

                <p>
                  Enter the individuals who ultimately own or control
                  the company.
                </p>

                {formData.beneficialOwners.map((person) =>
                  renderPersonFields(person, 'beneficialOwners')
                )}

                <button
                  type="button"
                  className="secondary-button"
                  style={{ marginTop: '15px' }}
                  onClick={() => addPerson('beneficialOwners')}
                >
                  + Add Another Beneficial Owner
                </button>
              </div>
            </>
          )}

          {/* STEP 4: CONTACT INFORMATION */}
          {currentStep === 4 && (
            <>
              <h2>Contact Information</h2>

              <p>
                Provide the primary contact details for communication
                during client onboarding.
              </p>

              <h3 style={{ marginTop: '25px' }}>
                A. Primary Contact
              </h3>

              <div className="form-grid">
                <label>
                  Contact Full Name *
                  <input
                    name="primaryContactName"
                    value={formData.primaryContactName}
                    onChange={handleChange}
                    placeholder="Enter contact's full name"
                    required
                  />
                </label>

                <label>
                  Designation / Job Title *
                  <input
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    placeholder="e.g. Finance Director"
                    required
                  />
                </label>

                <label>
                  Business Email Address *
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    required
                  />
                </label>

                <label>
                  Business Phone Number *
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    required
                  />
                </label>
              </div>

              <h3 style={{ marginTop: '35px' }}>
                B. Alternate Contact
              </h3>

              <p>
                Optional details of another person who can be contacted.
              </p>

              <div className="form-grid">
                <label>
                  Alternate Contact Name
                  <input
                    name="alternateContactName"
                    value={formData.alternateContactName}
                    onChange={handleChange}
                    placeholder="Enter alternate contact name"
                  />
                </label>

                <label>
                  Alternate Email
                  <input
                    type="email"
                    name="alternateEmail"
                    value={formData.alternateEmail}
                    onChange={handleChange}
                    placeholder="alternate@example.com"
                  />
                </label>

                <label>
                  Alternate Phone Number
                  <input
                    type="tel"
                    name="alternatePhone"
                    value={formData.alternatePhone}
                    onChange={handleChange}
                    placeholder="Enter alternate phone"
                  />
                </label>

                <label>
                  Preferred Communication *
                  <select
                    name="preferredCommunication"
                    value={formData.preferredCommunication}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select preference</option>
                    <option value="Email">Email</option>
                    <option value="Phone">Phone</option>
                    <option value="Both">Both Email and Phone</option>
                  </select>
                </label>

                <label style={{ gridColumn: '1 / -1' }}>
                  Correspondence Address *
                  <textarea
                    name="correspondenceAddress"
                    value={formData.correspondenceAddress}
                    onChange={handleChange}
                    placeholder="Enter the address for official correspondence"
                    rows={3}
                    required
                  />
                </label>
              </div>
            </>
          )}

          {/* STEP 5: KYC DOCUMENT CHECKLIST */}
          {currentStep === 5 && (
            <>
              <h2>KYC Document Checklist</h2>

              <p>
                Upload the required supporting documents for client due diligence.
              </p>

              <div
                style={{
                  marginTop: '22px',
                  padding: '18px',
                  background: '#eef5f8',
                  borderRadius: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <strong>Documents received</strong>
                  <strong>
                    {uploadedCount} / {formData.documents.length}
                  </strong>
                </div>

                <div
                  style={{
                    height: '9px',
                    background: '#dce6ed',
                    borderRadius: '10px',
                    marginTop: '12px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPercentage}%`,
                      background: '#219b83',
                      transition: 'width 0.3s',
                    }}
                  />
                </div>

                <p style={{ marginTop: '8px', fontSize: '12px' }}>
                  {Math.round(progressPercentage)}% of checklist documents selected
                </p>
              </div>

              <div style={{ marginTop: '22px' }}>
                {formData.documents.map((document) => (
                  <div
                    key={document.id}
                    className="document-card"
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <strong>{document.name}</strong>

                      <span
                        className={
                          document.status === 'Uploaded'
                            ? 'document-status uploaded'
                            : 'document-status pending'
                        }
                      >
                        {document.status}
                      </span>
                    </div>

                    <div
                      className="form-grid"
                      style={{ marginTop: '15px' }}
                    >
                      <label>
                        Upload Document
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(event) =>
                            handleDocumentUpload(
                              document.id,
                              event.target.files?.[0]
                            )
                          }
                        />
                      </label>

                      <label>
                        Expiry Date (if applicable)
                        <input
                          type="date"
                          value={document.expiryDate}
                          onChange={(event) =>
                            handleDocumentExpiry(
                              document.id,
                              event.target.value
                            )
                          }
                        />
                      </label>
                    </div>

                    {document.fileName && (
                      <p className="selected-file">
                        Selected file: {document.fileName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* FEEDBACK MESSAGE */}
          {message && (
            <div
              role="status"
              style={{
                marginTop: '20px',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '12px',
                color:
                  messageType === 'success'
                    ? '#20856a'
                    : '#b54747',
                background:
                  messageType === 'success'
                    ? '#e8f5ef'
                    : '#fceeee',
              }}
            >
              {message}
            </div>
          )}

          {/* FORM ACTIONS */}
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={saveDraft}
            >
              Save as Draft
            </button>

            {currentStep > 1 && (
              <button
                type="button"
                className="secondary-button"
                onClick={handlePrevious}
              >
                ← Previous
              </button>
            )}

            <button
              type="submit"
              className="primary-button"
            >
              {currentStep < 5
                ? 'Continue →'
                : 'Save Document Checklist'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ClientOnboarding;
