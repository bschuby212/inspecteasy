import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

interface PropertyRowProps {
  label: string;
  value: string;
  copyable?: boolean;
  swatch?: string;
  hiddenWhen?: boolean;
}

export function PropertyRow({
  label,
  value,
  copyable = true,
  swatch,
  hiddenWhen,
}: PropertyRowProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(id);
  }, [copied]);

  if (hiddenWhen || !value || value === "—" || value === "none") return null;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard may be blocked on some pages; fail silently.
    }
  }

  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <div className="row-value">
        {swatch && swatch !== "transparent" && swatch !== "—" ? (
          <span className="swatch" style={{ background: swatch }} />
        ) : null}
        <span className="value-text" title={value}>
          {value}
        </span>
        {copyable ? (
          <button
            type="button"
            className={`copy-btn${copied ? " copied" : ""}`}
            onClick={onCopy}
            aria-label={`Copy ${label}`}
            title={copied ? "Copied" : "Copy"}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        ) : null}
      </div>
    </div>
  );
}
