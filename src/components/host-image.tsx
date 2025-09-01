import React from "react";
import hypurrFiLogo from "../assets/logo/hypurrFi.svg";

const DEFAULT_MAPPING: Record<string, string> = {
  "app.hypurr.fi": hypurrFiLogo,
  "app.hyperliquid.xyz": "/src/assets/logo/hyperliquid.png",
};

const STYLE_MAPPING: Record<string, React.CSSProperties> = {
  "app.hypurr.fi": { height: 32, width: 70, marginLeft: -25 },
  "app.hyperliquid.xyz": {},
};

const HostImage: React.FC = () => {
  const origin = window.location.origin;
  const key = Object.keys(DEFAULT_MAPPING).find((k) => origin.includes(k));
  const src = key ? DEFAULT_MAPPING[key] : "/images/default.png";
  const customStyle = key ? STYLE_MAPPING[key] : {};
  const finalStyle: React.CSSProperties = {
    ...customStyle,
  };

  return <img src={src} alt="Load" style={finalStyle} />;
};

export default HostImage;
