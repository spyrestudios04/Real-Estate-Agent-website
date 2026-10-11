import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";

const emptyForm = {
  title: "",
  description: "",
  type: "offer",
  imageUrl: "",
};

export default function AdminUpdates() {
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadPosts() {
    const response = await fetch("/api/updates");

    if (!response.ok) {
      throw new Error("Unable to load posts");
    }

    setPosts(await response.json());
  }

  useEffect(() => {
    let ignore = false;

    fetch("/api/updates")
      .then((res) => {
        if (!res.ok) throw new Error("Unable to load posts");
        return res.json();
      })
      .then((data) => {
        if (!ignore) setPosts(data);
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      });

    return () => {
      ignore = true;
    };
  }, []);

  function changeField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 4_000_000) {
      setError("Choose an image smaller than 4 MB.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      setForm((current) => ({
        ...current,
        imageUrl: blob.url,
      }));
    } catch (err) {
      setError(err?.message || "Image upload failed.");
    } finally {
      setLoading(false);
    }
  }

  async function savePost(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = editingId
        ? `/api/updates/${editingId}`
        : "/api/updates";

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Unable to save post");
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadPosts();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startEditing(post) {
    setEditingId(post.id);
    setForm({
      title: post.title,
      description: post.description,
      type: post.type,
      imageUrl: post.imageUrl || "",
    });
  }

  async function deletePost(id) {
    if (!window.confirm("Delete this post?")) return;

    setError("");

    try {
      const response = await fetch(`/api/updates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete post");
      }

      await loadPosts();

      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main style={{ maxWidth: 850, margin: "40px auto", padding: 20 }}>
      <h1>Manage Website Updates</h1>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={savePost}>
        <p>
          <label>
            Title
            <input
              name="title"
              value={form.title}
              onChange={changeField}
              required
              style={{ display: "block", width: "100%" }}
            />
          </label>
        </p>

        <p>
          <label>
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={changeField}
              required
              style={{ display: "block", width: "100%" }}
            />
          </label>
        </p>

        <p>
          <label>
            Content type
            <select
              name="type"
              value={form.type}
              onChange={changeField}
            >
              <option value="offer">Offer</option>
              <option value="announcement">Announcement</option>
              <option value="gallery">Gallery photo</option>
            </select>
          </label>
        </p>

        <p>
          <label>
            Upload photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={uploadImage}
            />
          </label>
        </p>

        {form.imageUrl && (
          <img
            src={form.imageUrl}
            alt="Selected upload"
            style={{ maxWidth: 220, display: "block" }}
          />
        )}

        <p>
          <button disabled={loading} type="submit">
            {loading
              ? "Saving..."
              : editingId
                ? "Update post"
                : "Publish post"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel editing
            </button>
          )}
        </p>
      </form>

      <hr />

      <h2>Existing posts ({posts.length})</h2>

      {posts.map((post) => (
        <article
          key={post.id}
          style={{
            border: "1px solid #ccc",
            padding: 16,
            marginBottom: 12,
          }}
        >
          <strong>{post.title}</strong>
          <p>{post.type}</p>

          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt={post.title}
              style={{ maxWidth: 160, display: "block" }}
            />
          )}

          <p>{post.description}</p>

          <button onClick={() => startEditing(post)}>
            Edit
          </button>

          <button onClick={() => deletePost(post.id)}>
            Delete
          </button>
        </article>
      ))}
    </main>
  );
}