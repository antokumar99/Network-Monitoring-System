interface Props {
  /** device status (online/offline/unknown) or alert severity (warning/critical) */
  value: string;
}

export default function StatusBadge({ value }: Props) {
  return <span className={`badge badge-${value}`}>{value}</span>;
}
