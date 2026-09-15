export type FamilyChild = {
  name: string;
  birth_date: string;
  notes: string;
};

export type FamilyRecord = {
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  parent_notes: string;
  children: FamilyChild[];
};

export type RegistryExport = {
  schema_version: "1";
  source: string;
  exported_at: string;
  families: FamilyRecord[];
};
