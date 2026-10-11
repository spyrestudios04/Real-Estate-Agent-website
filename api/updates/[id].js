import { del, list, put } from "@vercel/blob";
import process from "node:process";

const PREFIX = "updates/";

function isAuthorized(req) {
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) return true;
  const provided =
    req.headers["x-admin-secret"] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "");
  return provided === secret;
}

async function findPost(id) {
  const { blobs } = await list({ prefix: PREFIX });

  const blob = blobs.find(
    (item) => item.pathname === `${PREFIX}${id}.json`
  );

  if (!blob) return null;

  const response = await fetch(blob.url);

  if (!response.ok) {
    throw new Error("Unable to read post");
  }

  return {
    blob,
    post: await response.json(),
  };
}

export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (
      typeof id !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(id)
    ) {
      return res.status(400).json({
        error: "Invalid post ID",
      });
    }

    const result = await findPost(id);

    if (!result) {
      return res.status(404).json({
        error: "Post not found",
      });
    }

    const { blob, post } = result;

    if (req.method === "GET") {
      return res.status(200).json(post);
    }

    if (req.method === "PATCH") {
      if (!isAuthorized(req)) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }

      const { title, description, type, imageUrl } =
        req.body ?? {};

      // If a new image is provided and there was an existing blob image, clean up old image
      if (
        typeof imageUrl === "string" &&
        post.imageUrl &&
        post.imageUrl !== imageUrl &&
        post.imageUrl.includes(".blob.vercel-storage.com")
      ) {
        try {
          await del(post.imageUrl);
        } catch (delErr) {
          console.warn("Failed to delete previous image blob:", delErr);
        }
      }

      const updated = {
        ...post,
        ...(typeof title === "string" && {
          title: title.trim(),
        }),
        ...(typeof description === "string" && {
          description: description.trim(),
        }),
        ...(typeof imageUrl === "string" && { imageUrl }),
        ...(type &&
          ["offer", "announcement", "gallery"].includes(type) && {
            type,
          }),
        updatedAt: new Date().toISOString(),
      };

      await put(
        blob.pathname,
        JSON.stringify(updated),
        {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "application/json",
        }
      );

      return res.status(200).json(updated);
    }

    if (req.method === "DELETE") {
      if (!isAuthorized(req)) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }

      const urlsToDelete = [blob.url];
      if (
        post.imageUrl &&
        post.imageUrl.includes(".blob.vercel-storage.com")
      ) {
        urlsToDelete.push(post.imageUrl);
      }

      await del(urlsToDelete);

      return res.status(200).json({
        message: "Post deleted",
      });
    }

    res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);

    return res.status(405).json({
      error: "Method not allowed",
    });
  } catch (error) {
    console.error("Post API error:", error);

    return res.status(500).json({
      error: "Unable to process post",
    });
  }
}
