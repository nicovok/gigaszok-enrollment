export type User = { name: string; email: string; picture?: string };

export type Term = {
  id: string;
  name: string;
  slug: string;
  active: number;
  webhook_secret: string;
  created_at: number;
};

export type Applicant = {
  id: string;
  term_id: string;
  child_name: string;
  parent_name: string;
  email: string;
  raw_json: string;
  paid: number;
  created_at: number;
};

export type CSVResult = {
  matched: number;
  updated: number;
  already_paid: number;
};

export type TemplateType = "registration" | "reminder" | "payment_confirmation";

export type TemplateData = {
  type: TemplateType;
  subject: string;
  body: string;
  has_banner: boolean;
  is_custom: boolean;
};

export type EmailLogType = "registration" | "reminder" | "payment_confirmation" | "custom";
export type EmailLog = { id: string; type: EmailLogType; sent_at: number };
