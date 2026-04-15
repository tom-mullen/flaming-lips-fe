"use client";

import DatePicker from "@/app/components/date-picker";
import Input from "@/app/components/ui/input";
import Select from "@/app/components/ui/select";
import { RIGHT_TYPES, RIGHT_TYPE_LABELS } from "@/app/lib/constants";

export interface RightsFieldValues {
  type: string;
  territory: string;
  ownership: string;
  startDate: string;
  endDate: string;
  source: string;
}

interface RightsFieldsProps {
  values: RightsFieldValues;
  onChange: (values: RightsFieldValues) => void;
}

const rightTypeOptions = RIGHT_TYPES.map((t) => ({
  value: t,
  label: RIGHT_TYPE_LABELS[t],
}));

export default function RightsFields({ values, onChange }: RightsFieldsProps) {
  function update(field: keyof RightsFieldValues, value: string) {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Select
        value={values.type}
        onChange={(v) => update("type", v)}
        options={rightTypeOptions}
      />
      <Input
        type="text"
        placeholder="Territory (e.g. US, worldwide)"
        value={values.territory}
        onChange={(e) => update("territory", e.target.value)}
      />
      <Input
        type="number"
        placeholder="Ownership %"
        value={values.ownership}
        onChange={(e) => update("ownership", e.target.value)}
        min="0"
        max="100"
        step="0.01"
      />
      <DatePicker
        value={values.startDate}
        onChange={(v) => update("startDate", v)}
        placeholder="Start date"
      />
      <DatePicker
        value={values.endDate}
        onChange={(v) => update("endDate", v)}
        placeholder="End date"
      />
      <Input
        type="text"
        placeholder="Source"
        value={values.source}
        onChange={(e) => update("source", e.target.value)}
      />
    </div>
  );
}
