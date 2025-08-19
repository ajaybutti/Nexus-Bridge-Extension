import React, { useCallback, useMemo, useState } from "react";
import type { Intent } from "@arcana/ca-sdk";
import Avail from "./avail";

export type IntentModalProps = {
  intentModal: {
    allow: () => void;
    deny: () => void;
    intent: Intent;
    refresh: () => Promise<Intent>;
  } | null;
  setIntentModal: (modal: IntentModalProps["intentModal"]) => void;
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  backdropFilter: "blur(2px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "space-between",
  zIndex: 2147483646,
  fontFamily:
    "Inter, system-ui, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif",
};

const modalStyle: React.CSSProperties = {
  width: "540px",
  maxWidth: "65vw",
  color: "#e5e7eb",
  paddingTop: "16px",
  position: "relative",
  background: "rgb(15, 26, 31)",
  border: "1px solid rgb(39, 48, 53)",
  borderRadius: 16,
  maxHeight: "100%",
  overflow: "auto",
  margin: "auto",
  boxSizing: "border-box",
  fontFamily:
    "Inter, system-ui, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif",
};

const sectionStyle: React.CSSProperties = {
  background: "rgb(15, 26, 31)",
  borderBottom: "1px solid rgb(39, 48, 53)",
  padding: 12,
  fontFamily:
    "Inter, system-ui, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif",
};

const chipStyle: React.CSSProperties = {
  background: "rgb(15, 26, 31)",
  border: "1px solid rgb(39, 48, 53)",
  borderRadius: 10,
  padding: "8px 12px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  justifyContent: "center",
  fontFamily:
    "Inter, system-ui, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif",
};

const btnBase: React.CSSProperties = {
  flex: 1,
  cursor: "pointer",
  fontWeight: 600,
  width: "100%",
  outline: "none",
  border: "1px solid transparent",
  boxSizing: "border-box",
  textAlign: "center",
  fontFamily:
    "Inter, system-ui, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif",
  height: "40px",
  lineHeight: "38px",
  padding: "0px 16px",
  borderRadius: "8px",
  fontSize: "12px",
  whiteSpace: "nowrap",

  transition:
    "background 0.2s ease-in-out, color 0.2s ease-in-out, border-color 0.2s ease-in-out, text-decoration-color 0.2s ease-in-out",
};

const btnStylePrimary: React.CSSProperties = {
  ...btnBase,
  color: "rgb(4, 6, 12)",
  backgroundColor: "rgb(80, 210, 193)",
};

const btnStyleMuted: React.CSSProperties = {
  ...btnBase,
  background: "#2a2f3a",
  color: "#e5e7eb",
  borderColor: "#3b424f",
};

export default function IntentModal({
  intentModal,
  setIntentModal,
}: IntentModalProps) {
  const [showSources, setShowSources] = useState(false);
  const [showFeesBreakdown, setShowFeesBreakdown] = useState(false);

  const onClose = useCallback(() => {
    if (!intentModal) return;
    intentModal.deny();
    setIntentModal(null);
  }, [intentModal, setIntentModal]);

  const handleAllow = useCallback(() => {
    if (!intentModal) return;
    intentModal.allow();
    setIntentModal(null);
  }, [intentModal, setIntentModal]);

  const content = useMemo(() => {
    if (!intentModal) return null;
    const { intent } = intentModal;
    return (
      <div style={modalStyle} role="dialog" aria-modal="true">
        <div style={{ padding: "0px 16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              gap: 8,
            }}
          >
            <img
              className="blob"
              src="/images/blob.gif"
              alt="Loading..."
              style={{ width: 70, filter: "grayscale(100%) brightness(1)" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>
                  Confirm Transaction
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                Please review the details of this transaction carefully.
              </div>
            </div>
          </div>

          <div style={{ height: 12 }} />

          {/* Route */}
          <div style={sectionStyle}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  justifyContent: "space-between",
                }}
              >
                {/* Token logo */}
                {intent.token?.logo ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "flex-start",
                        flexDirection: "column",
                      }}
                    >
                      <img
                        src={intent.token.logo}
                        width={24}
                        height={24}
                        style={{ borderRadius: 9999 }}
                        onError={(e) =>
                          (e.currentTarget.style.display = "none")
                        }
                      />
                      <div
                        style={{
                          marginTop: "-10px",
                          marginLeft: "16px",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {intent.sources?.map((s, i) => (
                          <img
                            src={s.chainLogo}
                            width={20}
                            height={20}
                            key={`${s.chainID}-${i}`}
                            style={{
                              borderRadius: 9999,
                              marginLeft: `-5px`,
                              zIndex: intent.sources.length - i,
                            }}
                            onError={(e) =>
                              (e.currentTarget.style.display = "none")
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-arrow-right-icon lucide-arrow-right"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
                {/* Destination */}
                {intent.destination ? (
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "flex-start",
                      flexDirection: "column",
                    }}
                  >
                    <img
                      src={intent.token.logo}
                      width={24}
                      height={24}
                      style={{ borderRadius: 9999 }}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                    <div
                      style={{
                        marginTop: "-10px",
                        marginLeft: "12px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <img
                        src={intent.destination.chainLogo}
                        width={18}
                        height={18}
                        onError={(e) =>
                          (e.currentTarget.style.display = "none")
                        }
                        style={{
                          borderRadius: 9999,
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Fees */}
          {intent.sources?.length && intent.sources.length > 1 ? (
            <div style={{ height: 12 }} />
          ) : null}

          <div style={sectionStyle}>
            <ExpandableRow
              strong
              label="Destination Amount"
              value={`${intent.sourcesTotal} ${intent.token?.symbol}`}
              expandLabel="View Sources"
              isExpanded={showSources}
              onToggle={() => setShowSources(!showSources)}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {intent.sources?.map((source, index) => (
                  <Row
                    key={`${source.chainID}-${index}`}
                    label={source.chainName}
                    value={`${source.amount} ${intent.token?.symbol}`}
                  />
                ))}
              </div>
            </ExpandableRow>
          </div>

          {intent.fees ? <div style={{ height: 12 }} /> : null}

          {intent.fees ? (
            <div style={sectionStyle}>
              <ExpandableRow
                strong
                label="Total Fees"
                value={`${intent.fees.total || "0"} ${intent.token?.symbol}`}
                expandLabel="View Breakup"
                isExpanded={showFeesBreakdown}
                onToggle={() => setShowFeesBreakdown(!showFeesBreakdown)}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <Row
                    label="Network Gas"
                    value={`${intent.fees.caGas || "0"} ${
                      intent.token?.symbol
                    }`}
                  />
                  {Number(intent.fees.solver) > 0 && (
                    <Row
                      label="Solver Fee"
                      value={`${intent.fees.solver} ${intent.token?.symbol}`}
                    />
                  )}
                  {Number(intent.fees.protocol) > 0 && (
                    <Row
                      label="Protocol Fee"
                      value={`${intent.fees.protocol} ${intent.token?.symbol}`}
                    />
                  )}
                  {Number(intent.fees.gasSupplied) > 0 && (
                    <Row
                      label="Additional Gas"
                      value={`${intent.fees.gasSupplied} ${intent.token?.symbol}`}
                    />
                  )}
                </div>
              </ExpandableRow>
            </div>
          ) : null}

          {/* Actions */}
          <div style={{ height: 16 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={btnStyleMuted}>
              Deny
            </button>
            <button onClick={handleAllow} style={{ ...btnStylePrimary }}>
              Allow
            </button>
          </div>
        </div>
        <Avail />
      </div>
    );
  }, [intentModal, handleAllow, onClose, showSources, showFeesBreakdown]);

  if (!intentModal) return null;
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{content}</div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: strong ? "#e5e7eb" : "#9ca3af",
          fontWeight: strong ? 600 : 500,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: strong ? 700 : 600 }}>
        {value}
      </span>
    </div>
  );
}

function ExpandableRow({
  label,
  value,
  expandLabel,
  isExpanded,
  onToggle,
  children,
  strong,
}: {
  label: string;
  value: string;
  expandLabel: string;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: strong ? "#e5e7eb" : "#9ca3af",
            fontWeight: strong ? 600 : 500,
          }}
        >
          {label}
        </span>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: strong ? 700 : 600 }}>
            {value}
          </span>
          <button
            onClick={onToggle}
            style={{
              background: "none",
              border: "none",
              color: "#3b82f6",
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: 0,
              gap: 4,
              fontFamily:
                "Inter, system-ui, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif",
            }}
          >
            {expandLabel}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease-in-out",
              }}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
      <div
        style={{
          overflow: "hidden",
          maxHeight: isExpanded ? "200px" : "0px",
          opacity: isExpanded ? 1 : 0,
          transition: "max-height 0.3s ease-in-out, opacity 0.25s ease-in-out",
        }}
      >
        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}
