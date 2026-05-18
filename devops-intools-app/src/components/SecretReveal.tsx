import { useState } from "react";
import { Icon } from "./Icon";

export function SecretReveal({ value }: { value: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="secret-box">
      <span className={`flex-1 ${shown ? "tracking-wide" : "tracking-[0.4em]"}`}>
        {shown ? value : "•".repeat(Math.min(value.length, 32))}
      </span>
      <button className="copy-btn reveal ml-auto" onClick={() => setShown((s) => !s)}>
        <Icon name={shown ? "eyeOff" : "eye"} size={14} /> {shown ? "Hide" : "Reveal"}
      </button>
      <button className="copy-btn" onClick={() => navigator.clipboard?.writeText(value)}>
        <Icon name="copy" size={14} /> Copy
      </button>
    </div>
  );
}
