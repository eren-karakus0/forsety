interface SectionLabelProps {
  number: string;
  className?: string;
}

export function SectionLabel({ number, className = "" }: SectionLabelProps) {
  return (
    <span
      className={`section-number select-none ${className}`}
      aria-hidden="true"
    >
      {number}
    </span>
  );
}
