export type OfficeStatus = "active" | "inactive";

export type Office = {
  id: string;
  name: string;
  code: string;
  is_head_office: boolean;
  status: OfficeStatus;
  created_at: string;
  updated_at: string;
};
