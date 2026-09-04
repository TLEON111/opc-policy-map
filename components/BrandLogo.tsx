export function BrandLogo() {
  return (
    <span className="brand-lockup">
      <svg
        className="brand-symbol"
        data-testid="brand-symbol"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <path
          d="M8.5 27.5C8.5 16.4 16.2 8 27 8c4.9 0 9 1.7 12.2 4.7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="6.5"
        />
        <path
          className="brand-symbol-path"
          d="M12 39c4.7-12.1 14.5-19.2 28.5-20.7-7 4.2-11.6 10.1-14 17.7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6.5"
        />
        <path
          className="brand-symbol-star"
          d="m40.5 3.5 1.2 3.3L45 8l-3.3 1.2-1.2 3.3-1.2-3.3L36 8l3.3-1.2 1.2-3.3Z"
        />
      </svg>
      <span className="brand-copy">
        <strong>OPC POLICY MAP</strong>
        <small>全国 OPC 政策地图</small>
      </span>
    </span>
  );
}
