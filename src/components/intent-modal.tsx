import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Intent } from "@arcana/ca-sdk";

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
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2147483646,
  fontFamily:
    "Inter, system-ui, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif",
};

const modalStyle: React.CSSProperties = {
  width: "28rem",
  maxWidth: "65vw",
  color: "#e5e7eb",
  padding: 16,
  position: "relative",
  background: "rgb(15, 26, 31)",
  border: "1px solid rgb(39, 48, 53)",
  borderRadius: 16,
  maxHeight: "100%",
  overflow: "auto",
  boxSizing: "border-box",
  fontFamily:
    "Inter, system-ui, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif",
};

const sectionStyle: React.CSSProperties = {
  background: "rgb(15, 26, 31)",
  border: "1px solid rgb(39, 48, 53)",
  borderRadius: 16,
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

const btnStyleGhost: React.CSSProperties = {
  ...btnBase,
  background: "transparent",
  color: "#9ca3af",
  borderColor: "#2a2f3a",
};

export default function IntentModal({
  intentModal,
  setIntentModal,
}: IntentModalProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onClose = useCallback(() => {
    if (!intentModal) return;
    intentModal.deny();
    setIntentModal(null);
  }, [intentModal, setIntentModal]);

  const handleAllow = useCallback(() => {
    if (!intentModal || isRefreshing) return;
    intentModal.allow();
    setIntentModal(null);
  }, [intentModal, isRefreshing, setIntentModal]);

  const handleRefresh = useCallback(async () => {
    if (!intentModal) return;
    setIsRefreshing(true);
    try {
      await intentModal.refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [intentModal]);

  useEffect(() => {
    if (!intentModal) return;
    const id = setInterval(() => {
      handleRefresh();
    }, 5000);
    return () => clearInterval(id);
  }, [intentModal, handleRefresh]);

  const content = useMemo(() => {
    if (!intentModal) return null;
    const { intent } = intentModal;
    return (
      <div style={modalStyle} role="dialog" aria-modal="true">
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
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {intent.sources?.map((s, i) => (
                  <div key={`${s.chainID}-${i}`} style={chipStyle}>
                    {s.chainLogo ? (
                      <img
                        src={s.chainLogo}
                        width={18}
                        height={18}
                        style={{ borderRadius: 9999 }}
                        onError={(e) =>
                          (e.currentTarget.style.display = "none")
                        }
                      />
                    ) : null}
                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                      {s.amount} {intent.token?.symbol}
                    </span>
                  </div>
                ))}
              </div>

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
                    className="lucide lucide-arrow-right-from-line-icon lucide-arrow-right-from-line"
                  >
                    <path d="M3 5v14" />
                    <path d="M21 12H7" />
                    <path d="m15 18 6-6-6-6" />
                  </svg>
                  <img
                    src={intent.token.logo}
                    width={24}
                    height={24}
                    style={{ borderRadius: 9999 }}
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
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
                </div>
              ) : null}

              {/* Destination */}
              {intent.destination ? (
                <div style={chipStyle}>
                  {intent.destination.chainLogo ? (
                    <img
                      src={intent.destination.chainLogo}
                      width={18}
                      height={18}
                      style={{ borderRadius: 9999 }}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : null}
                  <span style={{ fontSize: 12, fontWeight: 700 }}>
                    {intent.destination.amount} {intent.token?.symbol}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Totals for multi-source */}
            {intent.sources?.length && intent.sources.length > 1 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#9ca3af",
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily:
                    "Inter, system-ui, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif",
                }}
              >
                Total: {intent.sourcesTotal} {intent.token?.symbol}
              </div>
            ) : null}
          </div>
        </div>

        {/* Fees */}
        {intent.fees ? <div style={{ height: 12 }} /> : null}
        {intent.fees ? (
          <div style={sectionStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Row
                label="Network Gas"
                value={`${intent.fees.caGas || "0"} ${intent.token?.symbol}`}
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
              <div style={{ height: 4, borderTop: "1px solid #2a2f3a" }} />
              <Row
                strong
                label="Total Gas Cost"
                value={`${intent.fees.total || "0"} ${intent.token?.symbol}`}
              />
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div style={{ height: 16 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={btnStyleMuted}>
            Deny
          </button>
          <button
            onClick={handleAllow}
            style={{ ...btnStylePrimary, opacity: isRefreshing ? 0.6 : 1 }}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Allow"}
          </button>
          <button onClick={handleRefresh} style={btnStyleGhost}>
            Refresh
          </button>
        </div>
      </div>
    );
  }, [intentModal, isRefreshing, handleAllow, handleRefresh, onClose]);

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
