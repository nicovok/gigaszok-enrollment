export type BunRequest<T extends Record<string, string> = Record<string, string>> = Request & {
  params: T;
};

export type Admin = {
  id: string;
  pocketid_sub: string;
  name: string;
  email: string;
  created_at: number;
};

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

export type EmailLog = {
  id: string;
  applicant_id: string;
  type: "registration" | "reminder" | "payment_confirmation" | "custom";
  sent_at: number;
};

export type EmailTemplateType = "registration" | "reminder" | "payment_confirmation";

export type EmailTemplate = {
  id: string;
  term_id: string;
  type: EmailTemplateType;
  subject: string;
  body: string;
  banner_path: string | null;
  created_at: number;
};

export type CSVResult = {
  matched: number;
  updated: number;
  already_paid: number;
};
