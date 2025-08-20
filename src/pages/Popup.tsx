import { useEffect, useState } from "react";
import "./Popup.css";
import Browser from "webextension-polyfill";
import Avail from "../components/avail";

export default function () {
  const [switchState, setSwitchState] = useState(false);
  const [provider, setProvider] = useState<{
    name: string;
    icon: string;
    walletAddress: string;
  } | null>(null);

  function getSwitchStateText() {
    return switchState ? "Enabled" : "Disabled";
  }

  useEffect(() => {
    const checkChainAbstractionEnabled = async () => {
      const storage = await Browser.storage.local.get([
        "chainAbstractionEnabled",
        "nexusProviderName",
        "nexusProviderIcon",
        "nexusWalletAddress",
      ]);
      Browser.runtime.sendMessage({
        type: "chainAbstractionStateChanged",
        enabled: storage.chainAbstractionEnabled || false,
      });
      setSwitchState((storage.chainAbstractionEnabled as boolean) || false);

      const providerData = {
        name: storage.nexusProviderName as string,
        icon: storage.nexusProviderIcon as string,
        walletAddress: storage.nexusWalletAddress as string,
      };
      setProvider(providerData);
    };

    checkChainAbstractionEnabled();
    const onChanged = async (
      changes: { [key: string]: { oldValue?: unknown; newValue?: unknown } },
      areaName: string
    ) => {
      if (areaName !== "local") return;
      if (
        changes.nexusProviderName ||
        changes.nexusProviderIcon ||
        changes.nexusWalletAddress
      ) {
        const storage = await Browser.storage.local.get([
          "nexusProviderName",
          "nexusProviderIcon",
          "nexusWalletAddress",
        ]);

        const newProviderData = {
          name: storage.nexusProviderName as string,
          icon: storage.nexusProviderIcon as string,
          walletAddress: storage.nexusWalletAddress as string,
        };
        console.log("Updating provider data:", newProviderData);
        setProvider(newProviderData);
      }
    };
    Browser.storage.onChanged.addListener(onChanged as any);
    return () => {
      Browser.storage.onChanged.removeListener(onChanged as any);
    };
  }, []);

  async function handleChange() {
    const next = !switchState;
    await Browser.storage.local.set({
      chainAbstractionEnabled: next,
      ...(next
        ? {}
        : {
            nexusProviderName: null,
            nexusProviderIcon: null,
            nexusWalletAddress: null,
          }),
    });
    Browser.runtime.sendMessage({
      type: "chainAbstractionStateChanged",
      enabled: next,
    });
    setSwitchState(next);
    if (!next) {
      setProvider(null);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        width: "100%",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div className="popup-container">
        <input
          id="checkbox"
          type="checkbox"
          checked={switchState}
          onChange={handleChange}
          title={
            switchState
              ? "Turn OFF Chain Abstraction"
              : "Turn ON Chain Abstraction"
          }
        />
        <label className="switch" htmlFor="checkbox">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            className="slider"
          >
            <path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V256c0 17.7 14.3 32 32 32s32-14.3 32-32V32zM143.5 120.6c13.6-11.3 15.4-31.5 4.1-45.1s-31.5-15.4-45.1-4.1C49.7 115.4 16 181.8 16 256c0 132.5 107.5 240 240 240s240-107.5 240-240c0-74.2-33.8-140.6-86.6-184.6c-13.6-11.3-33.8-9.4-45.1 4.1s-9.4 33.8 4.1 45.1c38.9 32.3 63.5 81 63.5 135.4c0 97.2-78.8 176-176 176s-176-78.8-176-176c0-54.4 24.7-103.1 63.5-135.4z"></path>
          </svg>
        </label>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <h1>Avail Nexus is {getSwitchStateText()}</h1>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              alignItems: "flex-start",
            }}
          >
            {provider?.name && (
              <span
                style={{ opacity: 0.9, fontSize: "14px", color: "#9C9C9C" }}
              >
                Connected wallet
              </span>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                color: "#ddd",
                fontSize: "0.95rem",
                background: "#2A3134",
                border: "1px solid #2A3134",
                padding: "16px",
                borderRadius: 10,
                minWidth: 220,
                justifyContent: "flex-start",
              }}
              title={provider?.name ?? undefined}
            >
              {provider?.icon ? (
                <img
                  src={provider.icon}
                  alt={provider.name ?? "wallet"}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    boxShadow: "0 0 10px rgba(0,0,0,0.35)",
                    objectFit: "cover",
                    background: "#1f1f1f",
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: "#1f1f1f",
                    border: "1px solid #3a3a3a",
                  }}
                />
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <span style={{ opacity: 0.9, fontSize: "0.9rem" }}>
                  {provider?.name ? `${provider.name}` : "No wallet connected"}
                </span>
                {provider?.walletAddress && (
                  <span style={{ opacity: 0.9, fontSize: "0.9rem" }}>
                    {provider.walletAddress.slice(0, 6)}...
                    {provider.walletAddress.slice(-4)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Avail disableTopBorder={true} />
    </div>
  );
}
