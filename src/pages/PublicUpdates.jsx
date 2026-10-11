import { useEffect, useState } from "react";

export default function PublicUpdates({ type = "offer" }) {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/updates")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load updates");
        }

        return response.json();
      })
      .then(setPosts)
      .catch(() => setError("Updates are temporarily unavailable."));
  }, []);

  const visiblePosts = posts.filter(
    (post) => post.type === type
  );

  if (error) return <p>{error}</p>;

  return (
    <section>
      {visiblePosts.map((post) => (
        <article key={post.id}>
          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt={post.title}
              loading="lazy"
              style={{ maxWidth: "100%" }}
            />
          )}

          <h3>{post.title}</h3>
          <p>{post.description}</p>
        </article>
      ))}
    </section>
  );
}