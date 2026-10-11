import { useEffect, useState } from "react";

export default function PublicUpdates() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    fetch("/api/updates")
      .then((res) => {
        if (!res.ok) throw new Error("Unable to load updates");
        return res.json();
      })
      .then((data) => {
        if (!ignore && Array.isArray(data)) {
          setPosts(data);
        }
      })
      .catch(() => {
        // Silently handle public display error
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (loading || posts.length === 0) {
    return null;
  }

  const typeLabels = {
    offer: "Special Offer",
    announcement: "Announcement",
    gallery: "Featured Property",
  };

  return (
    <section className="bg-slate-50 py-16 px-4 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
            Latest Updates
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Featured Announcements & Offers
          </h2>
          <p className="mt-3 text-slate-600">
            Stay informed with our latest real estate updates, announcements, and exclusive offers.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts
            .filter((post) => Boolean(post && post.id))
            .map((post) => (
              <article
                key={post.id}
                className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100 transition hover:shadow-md"
              >
                {post.imageUrl ? (
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center bg-slate-100 text-sm text-slate-400">
                    No image available
                  </div>
                )}

                <div className="p-6">
                  <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {typeLabels[post.type] || post.type}
                  </span>

                  <h3 className="mt-3 text-lg font-bold text-slate-900 break-words">
                    {post.title}
                  </h3>

                  <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap break-words">
                    {post.description || ""}
                  </p>
                </div>
              </article>
            ))}
        </div>
      </div>
    </section>
  );
}