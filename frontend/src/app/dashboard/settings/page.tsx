"use client";

// TODO: admin routes are unauthenticated until Zainab's auth is merged; api_client must then send the auth header.

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Table, { Column } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Toast from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { getApiErrorMessage } from "@/utils/api_error_handler";
import { adminSidebarItems } from "@/constants/admin_sidebar";
import { useAdminSettings, useUpdateSetting } from "@/hooks/useAdminSettings";
import type { PlatformSetting } from "@/types/platform_setting";

export default function SettingsPage() {
  const { data: settings = [], isLoading: loading, error: queryError, refetch } = useAdminSettings();
  const updateSetting = useUpdateSetting();

  const error = queryError ? getApiErrorMessage(queryError, "Failed to load settings") : null;

  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error"; message: string }>({
    open: false,
    variant: "success",
    message: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<PlatformSetting | null>(null);
  const [editValue, setEditValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleOpenEdit = (setting: PlatformSetting) => {
    setEditingSetting(setting);
    let valStr = "";
    if (setting.value_type === "JSON" && typeof setting.value === "object") {
      valStr = JSON.stringify(setting.value, null, 2);
    } else {
      valStr = String(setting.value);
    }
    setEditValue(valStr);
    setModalOpen(true);
  };

  const handleSaveSetting = async () => {
    if (!editingSetting) return;
    
    try {
      setSubmitting(true);
      // Validate JSON if needed before sending to get better local errors, but server will 422 if invalid
      if (editingSetting.value_type === "JSON") {
        try {
          JSON.parse(editValue);
        } catch {
          setToast({ open: true, variant: "error", message: "Invalid JSON format" });
          setSubmitting(false);
          return;
        }
      }

      await updateSetting.mutateAsync({ key: editingSetting.key, payload: { value: editValue } });
      
      setToast({ open: true, variant: "success", message: "Setting updated successfully" });
      setModalOpen(false);
    } catch (err) {
      setToast({
        open: true,
        variant: "error",
        message: getApiErrorMessage(err, "Failed to save setting"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<PlatformSetting>[] = [
    {
      key: "key",
      header: "Key",
      render: (setting) => (
        <div>
          <div className="font-semibold">{setting.key}</div>
          {setting.is_public && (
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-soft text-brand uppercase tracking-wide">Public</span>
          )}
        </div>
      )
    },
    { key: "description", header: "Description" },
    {
      key: "value",
      header: "Current Value",
      render: (setting) => (
        <div className="max-w-[300px] truncate" title={String(setting.value)}>
          {setting.value_type === "JSON" && typeof setting.value === "object"
            ? JSON.stringify(setting.value)
            : String(setting.value)}
        </div>
      ),
    },
    {
      key: "value_type",
      header: "Type",
      render: (setting) => (
        <span className="px-2 py-1 rounded bg-surface border border-line text-xs font-mono text-muted">
          {setting.value_type}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (setting) => (
        <Button variant="outline" size="sm" onClick={() => handleOpenEdit(setting)} disabled={submitting}>
          Edit
        </Button>
      ),
    },
  ];

  const renderEditInput = () => {
    if (!editingSetting) return null;

    if (editingSetting.value_type === "BOOLEAN") {
      return (
        <Select
          label="Value"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          options={[
            { label: "True", value: "true" },
            { label: "False", value: "false" },
          ]}
        />
      );
    }
    
    if (editingSetting.value_type === "INTEGER" || editingSetting.value_type === "DECIMAL") {
      return (
        <Input
          label="Value"
          type="number"
          step={editingSetting.value_type === "DECIMAL" ? "any" : "1"}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
        />
      );
    }

    return (
      <Textarea
        label="Value"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className={editingSetting.value_type === "JSON" ? "font-mono text-sm" : ""}
      />
    );
  };

  const groupedSettings = settings.reduce<Record<string, PlatformSetting[]>>((acc, setting) => {
    if (!acc[setting.setting_group]) acc[setting.setting_group] = [];
    acc[setting.setting_group].push(setting);
    return acc;
  }, {});

  return (
    <DashboardLayout
      sidebarItems={adminSidebarItems}
      activeHref="/dashboard/settings"
      title="Platform Settings"
      description="Manage global application configuration"
      userName="Admin"
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Settings</h1>
        </div>

        {loading ? (
          <LoadingState message="Loading settings..." />
        ) : error ? (
          <ErrorState message={error} action={<Button onClick={() => refetch()}>Retry</Button>} />
        ) : Object.keys(groupedSettings).length === 0 ? (
          <EmptyState title="No settings found" description="There are no platform settings available." />
        ) : (
          Object.entries(groupedSettings).map(([group, groupSettings]) => (
            <div key={group} className="space-y-4">
              <h2 className="text-lg font-bold text-foreground capitalize">{group.replace(/_/g, " ")}</h2>
              <Table
                columns={columns}
                data={groupSettings}
                rowKey={(s) => s.key}
              />
            </div>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Edit Setting">
        <div className="space-y-4">
          <div className="p-4 bg-brand-soft/30 rounded-xl border border-brand-soft">
            <div className="text-sm font-semibold text-foreground">{editingSetting?.key}</div>
            <div className="text-xs text-muted mt-1">{editingSetting?.description}</div>
          </div>
          
          {renderEditInput()}
          
          <div className="flex justify-end gap-3 pt-4 border-t border-line">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSaveSetting} disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </Modal>

      <div className="fixed bottom-4 right-4 z-50">
        <Toast
          open={toast.open}
          onClose={() => setToast({ ...toast, open: false })}
          variant={toast.variant}
          message={toast.message}
        />
      </div>
    </DashboardLayout>
  );
}
