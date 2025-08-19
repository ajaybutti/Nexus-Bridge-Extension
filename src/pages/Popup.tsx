import { useEffect, useState } from "react";
import "./Popup.css";
import Browser from "webextension-polyfill";

export default function () {
  const [switchState, setSwitchState] = useState(false);
  const [provider, setProvider] = useState<{
    name: string;
    icon: string;
    walletAddress: string;
  } | null>(null);

  function getSwitchStateText() {
    return switchState ? "ON" : "OFF";
  }

  useEffect(() => {
    const checkChainAbstractionEnabled = async () => {
      const storage = await Browser.storage.local.get([
        "chainAbstractionEnabled",
        "nexusProviderName",
        "nexusProviderIcon",
        "nexusWalletAddress",
      ]);
      console.log("storage", storage, storage.chainAbstractionEnabled);
      Browser.runtime.sendMessage({
        type: "chainAbstractionStateChanged",
        enabled: storage.chainAbstractionEnabled || false,
      });
      setSwitchState((storage.chainAbstractionEnabled as boolean) || false);
      setProvider({
        name: storage.nexusProviderName as string,
        icon: storage.nexusProviderIcon as string,
        walletAddress: storage.nexusWalletAddress as string,
      });
    };

    checkChainAbstractionEnabled();
    const onChanged = (
      changes: { [key: string]: { oldValue?: unknown; newValue?: unknown } },
      areaName: string
    ) => {
      if (areaName !== "local") return;
      if (changes.nexusProviderName) {
        setProvider({
          name: changes.nexusProviderName.newValue as string,
          icon: changes.nexusProviderIcon.newValue as string,
          walletAddress: changes.nexusWalletAddress.newValue as string,
        });
      }
      if (changes.nexusProviderIcon) {
        setProvider({
          name: changes.nexusProviderName.newValue as string,
          icon: changes.nexusProviderIcon.newValue as string,
          walletAddress: changes.nexusWalletAddress.newValue as string,
        });
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
      ...(next ? {} : { nexusProviderName: null, nexusProviderIcon: null }),
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
    <div className="popup-container">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <img
          src="/icon-with-shadow.svg"
          alt="logo"
          style={{ width: 24, height: 24 }}
        />
        <h1 style={{ fontSize: "1.2rem", fontWeight: 600 }}>
          Powered by Avail
        </h1>
      </div>
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
        <h1>Chain Abstraction is turned {getSwitchStateText()}</h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            color: "#ddd",
            fontSize: "0.95rem",
            background: "#2a2a2a",
            border: "1px solid #3a3a3a",
            padding: "8px 12px",
            borderRadius: 10,
            minWidth: 220,
            justifyContent: "center",
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
                (e.currentTarget as HTMLImageElement).style.display = "none";
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
          <span style={{ opacity: 0.9, fontSize: "0.9rem" }}>
            {provider?.name
              ? `Connected wallet: ${provider.name}`
              : "No wallet connected"}
          </span>
          {provider?.walletAddress && (
            <span style={{ opacity: 0.9, fontSize: "0.9rem" }}>
              Address: {provider.walletAddress}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
