"use client";

import { useState } from "react";
import Button from "@/app/components/ui/button";
import Card from "@/app/components/ui/card";
import SectionLabel from "@/app/components/ui/section-label";
import RightsFields, { type RightsFieldValues } from "@/app/components/rights-fields";

export interface RightFormData {
  type: string;
  territory: string;
  ownership: number;
  start_date: string;
  end_date: string;
  source: string;
}

interface AddRightFormProps {
  onSubmit: (data: RightFormData) => void;
  onCancel: () => void;
}

export default function AddRightForm({ onSubmit, onCancel }: AddRightFormProps) {
  const [values, setValues] = useState<RightsFieldValues>({
    type: "copyright",
    territory: "",
    ownership: "",
    startDate: "",
    endDate: "",
    source: "",
  });

  function handleSubmit() {
    onSubmit({
      type: values.type,
      territory: values.territory,
      ownership: values.ownership ? parseFloat(values.ownership) : 0,
      start_date: values.startDate,
      end_date: values.endDate,
      source: values.source,
    });
  }

  return (
    <Card className="ml-5 space-y-3 rounded-xl p-4">
      <SectionLabel className="text-muted-foreground">New right</SectionLabel>
      <RightsFields values={values} onChange={setValues} />
      <div className="flex gap-2">
        <Button onClick={handleSubmit}>Add right</Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
