import { useState } from "react";
import { Icon } from "../components/Icon";
import type { User } from "../layout/Topbar";

export function LoginPage({ onLogin }: { onLogin: (u: User) => void }) {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "redirecting" | "verifying">("idle");

  const signIn = () => {
    setLoading(true);
    setStage("redirecting");
    setTimeout(() => setStage("verifying"), 900);
    setTimeout(() => {
      onLogin({ name: "Admin", email: "admin@devops.internal", initials: "AD" });
    }, 1900);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="head">
          <div className="brand-large">
            <div className="brand-mark">DI</div>
            <div>
              <div>DevOps Intools</div>
              <div className="brand-meta">Internal Platform</div>
            </div>
          </div>
          <h1>Sign in to continue</h1>
          <p>Restricted to authorized DevOps / SRE engineers. All actions are auditable.</p>
        </div>
        <div className="body">
          <button className={`sso-btn ${loading ? "loading" : ""}`} onClick={signIn} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" />
                {stage === "redirecting" ? "Redirecting to Microsoft…" : "Verifying identity…"}
              </>
            ) : (
              <>
                <svg className="ms-logo" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                Continue with Microsoft (Azure AD)
              </>
            )}
          </button>
          <div className="login-or">SSO only</div>
          <div className="notice info" style={{ marginTop: 2 }}>
            <Icon name="shield" size={14} className="ic" />
            <div>
              Membership in <span className="mono">sg-devops-intools</span> is required.
            </div>
          </div>
        </div>
        <div className="login-foot">
          <span>v1.0.0</span>
          <span className="row-tight">
            <span className="env-pill"><span className="dot" /> all systems normal</span>
          </span>
        </div>
      </div>
    </div>
  );
}
