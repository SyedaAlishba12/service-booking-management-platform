export interface PlatformSetting {
  key: string;
  value: string | number | boolean | object;
  value_type: "STRING" | "INTEGER" | "DECIMAL" | "BOOLEAN" | "JSON";
  setting_group: string;
  description: string | null;
  is_public: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface SettingUpdatePayload {
  value: string;
}
