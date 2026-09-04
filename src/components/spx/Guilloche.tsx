import { useId } from "react";

/**
 * Micro-engraved banknote field. Fine, non-repeating hairline geometry at low
 * opacity, with a specular highlight that tilts with the pointer (driven by
 * --mx / --my on the hero band, no per-frame layout work).
 */
export function Guilloche() {
  const id = useId();
  const rings = Array.from({ length: 26 }, (_, i) => i);

  return (
    <div className="guilloche-field" aria-hidden>
      <svg className="guilloche-lines" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <clipPath id={`${id}-clip`}>
            <rect x="0" y="0" width="1600" height="900" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id}-clip)`} fill="none" stroke="var(--amber)" strokeWidth="0.6">
          {rings.map((i) => {
            const r = 90 + i * 27;
            const k = 1 + i * 0.037;
            return (
              <ellipse
                key={`a${i}`}
                cx={800}
                cy={430}
                rx={r * k}
                ry={r / k}
                transform={`rotate(${i * 7} 800 430)`}
                opacity={0.05}
              />
            );
          })}
          {rings.map((i) => (
            <ellipse
              key={`b${i}`}
              cx={800}
              cy={430}
              rx={620 - i * 21}
              ry={210 - i * 7}
              transform={`rotate(${-i * 11} 800 430)`}
              opacity={0.035}
            />
          ))}
        </g>
      </svg>
      <div className="guilloche-specular" />
    </div>
  );
}
