import React, { useMemo } from "react";
import type { AllowanceHookSources } from "@arcana/ca-sdk";
import Decimal from "decimal.js";
import Avail from "./avail";

export type AllowanceModalProps = {
  allowance: {
    allow: (s: Array<"max" | "min" | bigint | string>) => void;
    deny: () => void;
    sources: AllowanceHookSources;
  } | null;
  setAllowance: (a: AllowanceModalProps["allowance"]) => void;
};

const overlay: React.CSSProperties = {
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

const modal: React.CSSProperties = {
  width: "28rem",
  maxWidth: "65vw",
  color: "#e5e7eb",
  paddingTop: "16px",
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

const pill: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "rgb(15, 26, 31)",
  border: "1px solid rgb(39, 48, 53)",
  borderRadius: 10,
  padding: "8px 12px",
  gap: 8,
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

export default function AllowanceModal({
  allowance,
  setAllowance,
}: AllowanceModalProps) {
  const rows = useMemo(() => {
    if (!allowance) return [] as React.ReactNode[];

    return allowance.sources.map((s, idx) => {
      const currentAllowance = new Decimal(s.allowance.current)
        .div(Decimal.pow(10, 6))
        .toFixed();
      const requiredAllowance = new Decimal(s.allowance.minimum)
        .div(Decimal.pow(10, 6))
        .toFixed();

      return (
        <div key={idx} style={pill}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {s.chain.logo ? (
              <img
                src={s.chain.logo}
                width={18}
                height={18}
                style={{ borderRadius: 9999 }}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : null}
            <div
              style={{
                fontSize: 12,
                color: "#cbd5e1",
                fontFamily:
                  "Inter, system-ui, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif",
              }}
            >
              {s.chain.name}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
              fontSize: 12,
              fontFamily:
                "Inter, system-ui, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif",
            }}
          >
            <div style={{ color: "#9ca3af" }}>
              Current allowance: {String(currentAllowance)}
            </div>
            <div style={{ fontWeight: 700 }}>
              Required: {String(requiredAllowance)}
            </div>
          </div>
        </div>
      );
    });
  }, [allowance]);

  if (!allowance) return null;
  return (
    <div
      style={overlay}
      onClick={() => {
        allowance.deny();
        setAllowance(null);
      }}
    >
      <div
        style={modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ padding: "0px 16px" }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 16,
              marginBottom: 6,
              fontFamily:
                "Inter, system-ui, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif",
            }}
          >
            Approve Spend
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              fontFamily:
                "Inter, system-ui, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif",
            }}
          >
            We need approvals to proceed. Minimum approval is requested for each
            source chain.
          </div>
          <div style={{ height: 12 }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: "200px",
              overflowY: "scroll",
              scrollbarWidth: "none",
            }}
          >
            {rows}
          </div>
          <div style={{ height: 16 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              style={{ ...btnStyleMuted }}
              onClick={() => {
                allowance.deny();
                setAllowance(null);
              }}
            >
              Cancel
            </button>
            <button
              style={{ ...btnStylePrimary }}
              onClick={() => {
                allowance.allow(["min"]);
                setAllowance(null);
              }}
            >
              Allow Min
            </button>
          </div>
        </div>
        <Avail />
      </div>
    </div>
  );
}
