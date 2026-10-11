import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

const emptyForm = {
  title: "",
  description: "",
  type: "offer",
  image: "",
};

export default function ContentManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [adminKey, setAdminKey] = useState(() => {
    try {
      return localStorage.getItem("cms_admin_key") || "";
    } catch {
      return "";
    }
  });

  function updateAdminKey(value) {
    setAdminKey(value);
    try {
      if (value) {
        localStorage.setItem("cms_admin_key", value);
      } else {
        localStorage.removeItem("cms_admin_key");
      }
    } catch {
      // ignore storage errors
    }
  }

  const fileInputRef = useRef(null);

  async function fetchPosts() {
    try {
      const res = await fetch("/api/updates");
      if (!res.ok) {
        throw new Error("Unable to fetch updates from server");
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message || "Failed to load content.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    fetch("/api/updates")
      .then((res) => {
        if (!res.ok) throw new Error("Unable to load updates from server");
        return res.json();
      })
      .then((data) => {
        if (!ignore && Array.isArray(data)) setItems(data);
      })
      .catch((err) => {
        if (!ignore) setErrorMessage(err.message || "Failed to load content.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPG, PNG, or WebP).");
      event.target.value = "";
      return;
    }

    if (file.size > 4_000_000) {
      alert("Choose an image smaller than 4 MB.");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        headers: adminKey ? { "x-admin-secret": adminKey } : undefined,
      });

      setForm((current) => ({
        ...current,
        image: blob.url,
      }));
      setErrorMessage("");
    } catch (err) {
      console.error("Vercel Blob upload failed:", err);
      let message = err?.message || "Image upload failed.";

      if (
        message.includes("retrieve the client token") ||
        message.includes("retrieveClientToken")
      ) {
        try {
          const testRes = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(adminKey ? { "x-admin-secret": adminKey } : {}),
            },
            body: JSON.stringify({
              type: "blob.generate-client-token",
              payload: { pathname: file.name, clientPayload: null, multipart: false },
            }),
          });
          const errorData = await testRes.json().catch(() => ({}));
          if (errorData.error) {
            message = errorData.error;
          } else {
            message = `Upload endpoint returned HTTP ${testRes.status} (${testRes.statusText || "Error"})`;
          }
        } catch (fetchErr) {
          message = `Network error contacting /api/upload: ${fetchErr.message}`;
        }
      }

      setErrorMessage(`Upload failed: ${message}`);
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemoveImage() {
    setForm((current) => ({
      ...current,
      image: "",
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      alert("Please enter a title.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const url = editingId
        ? `/api/updates/${editingId}`
        : "/api/updates";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(adminKey ? { "x-admin-secret": adminKey } : {}),
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          type: form.type,
          imageUrl: form.image || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            (editingId ? "Failed to update content" : "Failed to create content")
        );
      }

      setForm(emptyForm);
      setEditingId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await fetchPosts();
    } catch (err) {
      setErrorMessage(err.message || "Failed to save content.");
      alert(err.message || "Failed to save content.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(item) {
    setForm({
      title: item.title ?? "",
      description: item.description ?? "",
      type: item.type ?? "offer",
      image: item.imageUrl || item.image || "",
    });

    setEditingId(item.id);
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this item?")) return;

    setErrorMessage("");

    try {
      const response = await fetch(`/api/updates/${id}`, {
        method: "DELETE",
        headers: adminKey ? { "x-admin-secret": adminKey } : {},
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete item");
      }

      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }

      await fetchPosts();
    } catch (err) {
      setErrorMessage(err.message || "Failed to delete item.");
      alert(err.message || "Failed to delete item.");
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const typeLabels = {
    offer: "Offer",
    announcement: "Announcement",
    gallery: "Gallery",
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
              Website content
            </p>

            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Content Manager
            </h1>

            <p className="mt-2 text-slate-600">
              Add and manage your website's offers, announcements, and gallery online with Vercel Blob.
            </p>
          </div>

          <div className="flex flex-col items-start gap-1 sm:items-end">
            <label
              htmlFor="admin-key-input"
              className="text-xs font-medium text-slate-500"
            >
              Admin Key (if configured)
            </label>
            <input
              id="admin-key-input"
              type="password"
              placeholder="Enter secret key..."
              value={adminKey}
              onChange={(e) => updateAdminKey(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
            />
          </div>
        </header>

        <section className="mb-10 rounded-2xl bg-white p-5 shadow-sm sm:p-7">
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 flex items-start justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage("")}
                className="ml-4 font-semibold text-red-700 hover:text-red-900"
              >
                Dismiss
              </button>
            </div>
          )}

          <h2 className="mb-5 text-xl font-semibold">
            {editingId ? "Edit content" : "Create content"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="content-title"
                  className="mb-2 block text-sm font-medium"
                >
                  Title *
                </label>

                <input
                  id="content-title"
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  placeholder="e.g. Weekend Special Offer"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="content-type"
                  className="mb-2 block text-sm font-medium"
                >
                  Content type
                </label>

                <select
                  id="content-type"
                  name="type"
                  value={form.type}
                  onChange={updateField}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500"
                >
                  <option value="offer">Offer</option>
                  <option value="announcement">Announcement</option>
                  <option value="gallery">Gallery</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="content-description"
                className="mb-2 block text-sm font-medium"
              >
                Description
              </label>

              <textarea
                id="content-description"
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Write some details..."
                rows={4}
                className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label
                htmlFor="content-image"
                className="mb-2 block text-sm font-medium"
              >
                Image (optional)
              </label>

              <input
                id="content-image"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImage}
                disabled={isUploading}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
              />

              {isUploading && (
                <p className="mt-2 text-sm font-medium text-indigo-600">
                  Uploading image to Vercel Blob...
                </p>
              )}

              {form.image && (
                <div className="mt-4">
                  <img
                    src={form.image}
                    alt="Selected preview"
                    className="h-40 w-full rounded-lg object-cover sm:w-64"
                  />

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="mt-2 text-sm text-red-600 hover:underline"
                  >
                    Remove image
                  </button>
                </div>
              )}

              <p className="mt-2 text-xs text-slate-500">
                Max size: 4 MB (JPG, PNG, or WebP). Uploaded securely to Vercel Blob.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSaving || isUploading}
                className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving
                  ? "Saving to Vercel..."
                  : editingId
                  ? "Save changes"
                  : "Add content"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-lg border border-slate-300 px-5 py-3 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Your content</h2>

            <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500">
              Loading online content from Vercel Blob...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <h3 className="text-lg font-semibold">No content yet</h3>
              <p className="mt-2 text-slate-500">
                Add your first offer, announcement, or gallery item above.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items
                .filter((item) => Boolean(item && item.id))
                .map((item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl bg-white shadow-sm"
                  >
                    {item.imageUrl || item.image ? (
                      <img
                        src={item.imageUrl || item.image}
                        alt={item.title}
                        className="h-48 w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center bg-slate-200 text-sm text-slate-500">
                        No image
                      </div>
                    )}

                    <div className="p-5">
                      <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {typeLabels[item.type] || item.type}
                      </span>

                      <h3 className="mt-3 break-words text-lg font-bold">
                        {item.title}
                      </h3>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
                        {item.description || "No description provided."}
                      </p>

                      <div className="mt-5 flex gap-3 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </section>

        <p className="mt-10 text-center text-xs text-slate-500">
          Online Content Manager · Connected to Vercel Blob
        </p>
      </div>
    </main>
  );
}
