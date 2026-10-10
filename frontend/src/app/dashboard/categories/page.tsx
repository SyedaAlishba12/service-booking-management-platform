"use client";

// TODO: admin routes are unauthenticated until Zainab's auth is merged; api_client must then send the auth header.

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Table, { Column } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Toast from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { getApiErrorMessage } from "@/utils/api_error_handler";
import { adminSidebarItems } from "@/constants/admin_sidebar";
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeactivateCategory,
  useReactivateCategory,
} from "@/hooks/useAdminCategories";
import type { Category, CategoryCreatePayload, CategoryUpdatePayload } from "@/types/category";

export default function CategoriesPage() {
  const { data: categories = [], isLoading: loading, error: queryError, refetch } = useAdminCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deactivateCategory = useDeactivateCategory();
  const reactivateCategory = useReactivateCategory();

  const error = queryError ? getApiErrorMessage(queryError, "Failed to load categories") : null;

  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error"; message: string }>({
    open: false,
    variant: "success",
    message: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    display_order: "",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryToDeactivate, setCategoryToDeactivate] = useState<Category | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        image_url: category.image_url || "",
        display_order: category.display_order.toString(),
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: "", slug: "", description: "", image_url: "", display_order: "" });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleSaveCategory = async () => {
    if (!formData.name.trim()) {
      setToast({ open: true, variant: "error", message: "Name is required" });
      return;
    }

    try {
      setSubmitting(true);
      if (editingCategory) {
        const payload: CategoryUpdatePayload = {};
        if (formData.name !== editingCategory.name) payload.name = formData.name;
        if (formData.slug !== editingCategory.slug) payload.slug = formData.slug;
        if (formData.description !== (editingCategory.description || "")) payload.description = formData.description;
        if (formData.image_url !== (editingCategory.image_url || "")) payload.image_url = formData.image_url;
        
        const newOrder = formData.display_order ? parseInt(formData.display_order, 10) : undefined;
        if (newOrder !== undefined && newOrder !== editingCategory.display_order) {
          payload.display_order = newOrder;
        }

        await updateCategory.mutateAsync({ id: editingCategory.id, payload });
        setToast({ open: true, variant: "success", message: "Category updated successfully" });
      } else {
        const payload: CategoryCreatePayload = {
          name: formData.name,
          ...(formData.slug && { slug: formData.slug }),
          ...(formData.description && { description: formData.description }),
          ...(formData.image_url && { image_url: formData.image_url }),
          ...(formData.display_order && { display_order: parseInt(formData.display_order, 10) }),
        };
        await createCategory.mutateAsync(payload);
        setToast({ open: true, variant: "success", message: "Category created successfully" });
      }
      setModalOpen(false);
    } catch (err) {
      setToast({
        open: true,
        variant: "error",
        message: getApiErrorMessage(err, "Failed to save category"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!categoryToDeactivate) return;
    try {
      setDeactivating(true);
      await deactivateCategory.mutateAsync(categoryToDeactivate.id);
      setToast({ open: true, variant: "success", message: "Category deactivated successfully" });
      setDialogOpen(false);
    } catch (err) {
      setToast({
        open: true,
        variant: "error",
        message: getApiErrorMessage(err, "Failed to deactivate category"),
      });
    } finally {
      setDeactivating(false);
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await reactivateCategory.mutateAsync(id);
      setToast({ open: true, variant: "success", message: "Category reactivated successfully" });
    } catch (err) {
      setToast({
        open: true,
        variant: "error",
        message: getApiErrorMessage(err, "Failed to reactivate category"),
      });
    }
  };

  const columns: Column<Category>[] = [
    { key: "name", header: "Name" },
    { key: "slug", header: "Slug" },
    { key: "display_order", header: "Display Order" },
    {
      key: "is_active",
      header: "Status",
      render: (cat) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${cat.is_active ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
          {cat.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (cat) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenModal(cat)} disabled={submitting || deactivating}>
            Edit
          </Button>
          {cat.is_active ? (
            <Button variant="danger" size="sm" onClick={() => { setCategoryToDeactivate(cat); setDialogOpen(true); }} disabled={submitting || deactivating}>
              Deactivate
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => handleReactivate(cat.id)} disabled={submitting || deactivating}>
              Reactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      sidebarItems={adminSidebarItems}
      activeHref="/dashboard/categories"
      title="Categories"
      description="Manage service categories"
      userName="Admin"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          <Button onClick={() => handleOpenModal()} disabled={loading || submitting || deactivating}>
            Add Category
          </Button>
        </div>

        {loading ? (
          <LoadingState message="Loading categories..." />
        ) : error ? (
          <ErrorState message={error} action={<Button onClick={() => refetch()}>Retry</Button>} />
        ) : (
          <Table
            columns={columns}
            data={categories}
            rowKey={(cat) => cat.id}
            emptyState={<EmptyState title="No categories found" description="Create your first category to get started." />}
          />
        )}
      </div>

      <Modal open={modalOpen} onClose={handleCloseModal} title={editingCategory ? "Edit Category" : "Add Category"}>
        <div className="space-y-4">
          <Input label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} hint="Auto-generated if empty" />
          <Textarea label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          <Input label="Image URL" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} />
          <Input label="Display Order" type="number" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: e.target.value })} />
          
          <div className="flex justify-end gap-3 pt-4 border-t border-line">
            <Button variant="outline" onClick={handleCloseModal} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </Modal>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Category"
        description={`Are you sure you want to deactivate "${categoryToDeactivate?.name}"?`}
        variant="danger"
        confirmText="Deactivate"
        loading={deactivating}
      />

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
