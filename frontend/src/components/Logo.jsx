import React from 'react';

// Signature element: interconnected nodes — a small trade network, the brand thesis.
export default function Logo({ height = 30, showWordmark = true }) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <svg height={height} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="32" height="32" rx="6" fill="var(--color-primary)" />
        <g stroke="#60A5FA" strokeWidth="1.6" fill="#fff">
          <line x1="8" y1="9" x2="16" y2="16" />
          <line x1="24" y1="9" x2="16" y2="16" />
          <line x1="16" y1="16" x2="16" y2="24" />
          <circle cx="8" cy="9" r="2.4" />
          <circle cx="24" cy="9" r="2.4" />
          <circle cx="16" cy="16" r="2.8" />
          <circle cx="16" cy="24" r="2.4" />
        </g>
      </svg>
      {showWordmark && (
        <span className="font-semibold tracking-tight text-white text-lg leading-none">
          NEXUS
        </span>
      )}
    </span>
  );
}
