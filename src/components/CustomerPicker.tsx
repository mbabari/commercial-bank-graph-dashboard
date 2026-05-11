"use client";

import { useEffect, useState } from "react";

interface Customer {
  customerId: string;
  name: string;
  segment: string;
  region: string;
}

interface Props {
  value: string;
  onChange: (id: string) => void;
}

export default function CustomerPicker({ value, onChange }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then(setCustomers)
      .catch(console.error);
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      {customers.map((c) => (
        <option key={c.customerId} value={c.customerId}>
          {c.name} ({c.segment} — {c.region})
        </option>
      ))}
    </select>
  );
}
