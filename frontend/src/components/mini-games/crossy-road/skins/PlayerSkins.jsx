
/* ─────────────── Chicken ─────────────── */
export function Chicken({ direction = "up" }) {
  const isDown = direction === "down";
  return (
    <svg
      viewBox="0 0 100 100"
      style={{
        width: "100%",
        height: "100%",
        transform: isDown ? "rotate(180deg)" : "none",
      }}
    >
      <g>
        <ellipse
          cx="50"
          cy="60"
          rx="28"
          ry="35"
          fill="#f1c40f"
          stroke="#e67e22"
          strokeWidth="3"
        />
        <path
          d="M 25 55 C 20 60, 20 75, 30 75"
          fill="#e67e22"
          stroke="#d68910"
          strokeWidth="2"
        />
        <path
          d="M 75 55 C 80 60, 80 75, 70 75"
          fill="#e67e22"
          stroke="#d68910"
          strokeWidth="2"
        />
        <path
          d="M 50 85 Q 40 92, 38 98"
          stroke="#e67e22"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 50 85 Q 50 95, 50 100"
          stroke="#e67e22"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 50 85 Q 60 92, 62 98"
          stroke="#e67e22"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse
          cx="50"
          cy="28"
          rx="16"
          ry="14"
          fill="#f1c40f"
          stroke="#e67e22"
          strokeWidth="3"
        />
        <path
          d="M 45 18 Q 48 12, 50 18 Q 52 12, 55 18"
          fill="#e74c3c"
          stroke="#c0392b"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}

/* ─────────────── Cow ─────────────── */
export function Cow({ direction = "up" }) {
  const isDown = direction === "down";
  return (
    <svg
      viewBox="0 0 100 100"
      style={{
        width: "100%",
        height: "100%",
        transform: isDown ? "rotate(180deg)" : "none",
      }}
    >
      <g>
        <ellipse
          cx="50"
          cy="62"
          rx="30"
          ry="36"
          fill="#ffffff"
          stroke="#2c3e50"
          strokeWidth="3"
        />
        <ellipse cx="38" cy="55" rx="9" ry="12" fill="#2c3e50" />
        <ellipse cx="60" cy="68" rx="11" ry="14" fill="#2c3e50" />
        <ellipse cx="48" cy="80" rx="7" ry="10" fill="#2c3e50" />
        <path
          d="M 50 90 Q 52 96, 48 100"
          stroke="#2c3e50"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="48" cy="100" r="3" fill="#2c3e50" />
        <ellipse
          cx="50"
          cy="26"
          rx="18"
          ry="16"
          fill="#ffffff"
          stroke="#2c3e50"
          strokeWidth="3"
        />
        <ellipse
          cx="34"
          cy="22"
          rx="6"
          ry="10"
          fill="#ffb6c1"
          stroke="#2c3e50"
          strokeWidth="2"
        />
        <ellipse
          cx="66"
          cy="22"
          rx="6"
          ry="10"
          fill="#ffb6c1"
          stroke="#2c3e50"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}

/* ─────────────── Pig ─────────────── */
export function Pig({ direction = "up" }) {
  const isDown = direction === "down";
  return (
    <svg
      viewBox="0 0 100 100"
      style={{
        width: "100%",
        height: "100%",
        transform: isDown ? "rotate(180deg)" : "none",
      }}
    >
      <g>
        <ellipse
          cx="50"
          cy="62"
          rx="30"
          ry="35"
          fill="#ffb6c1"
          stroke="#e91e63"
          strokeWidth="3"
        />
        <path
          d="M 50 88 Q 54 90, 52 93 Q 50 96, 52 98"
          stroke="#e91e63"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse
          cx="50"
          cy="28"
          rx="17"
          ry="15"
          fill="#ffb6c1"
          stroke="#e91e63"
          strokeWidth="3"
        />
      </g>
    </svg>
  );
}

/* ─────────────── Mantis ─────────────── */
export function Mantis({ direction = "up" }) {
  const isDown = direction === "down";
  return (
    <svg
      viewBox="0 0 100 100"
      style={{
        width: "100%",
        height: "100%",
        transform: isDown ? "rotate(180deg)" : "none",
      }}
    >
      <g>
        <ellipse
          cx="50"
          cy="70"
          rx="16"
          ry="23"
          fill="#7cb342"
          stroke="#558b2f"
          strokeWidth="2"
        />
        <ellipse
          cx="50"
          cy="45"
          rx="17"
          ry="21"
          fill="#8bc34a"
          stroke="#558b2f"
          strokeWidth="2"
        />
        <path
          d="M 36 30 L 50 17 L 64 30 L 61 34 L 39 34 Z"
          fill="#9ccc65"
          stroke="#558b2f"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}

