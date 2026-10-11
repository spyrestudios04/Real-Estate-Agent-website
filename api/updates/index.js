import { list, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import process from "node:process";
import singlePostHandler from "./[id].js";

const PREFIX = "updates/";

function isAuthorized(req) {
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) return true;
  const provided =
    req.headers["x-admin-secret"] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "");
  return provided === secret;
}

export default async function handler(req, res) {
  try {
    const urlPath = req.url ? req.url.split("?")[0] : "";
    const hasPathId = /\/api\/updates\/[a-f0-9-]{36}/i.test(urlPath);
    const hasQueryId = typeof req.query?.id === "string" && req.query.id.trim().length > 0;

    if (hasPathId || hasQueryId || req.method === "DELETE" || req.method === "PATCH") {
      return singlePostHandler(req, res);
    }

    if (req.method === "GET") {
      const { blobs } = await list({ prefix: PREFIX });

      const rawPosts = await Promise.all(
        blobs
          .filter((blob) => blob.pathname.endsWith(".json"))
          .map(async (blob) => {
            try {
              const response = await fetch(blob.url);
              if (!response.ok) return null;
              return await response.json();
            } catch (err) {
              console.warn("Failed to read post blob:", blob.pathname, err);
              return null;
            }
          })
      );

      const posts = rawPosts.filter(Boolean);

      // Sort posts newest first by createdAt
      posts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      return res.status(200).json(posts);
    }

    if (req.method === "POST") {
      if (!isAuthorized(req)) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }

      const { title, description = "", type = "offer", imageUrl = "" } =
        req.body ?? {};

      if (
        typeof title !== "string" ||
        !title.trim() ||
        typeof description !== "string" ||
        !["offer", "announcement", "gallery"].includes(type)
      ) {
        return res.status(400).json({
          error: "Invalid post data. Title is required and type must be offer, announcement, or gallery.",
        });
      }

      const id = randomUUID();

      const post = {
        id,
        title: title.trim(),
        description: description.trim(),
        type,
        imageUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await put(
        `${PREFIX}${id}.json`,
        JSON.stringify(post),
        {
          access: "public",
          addRandomSuffix: false,
          contentType: "application/json",
        }
      );

      return res.status(201).json(post);
    }

    res.setHeader("Allow", ["GET", "POST"]);

    return res.status(405).json({
      error: "Method not allowed",
    });
  } catch (error) {
    console.error("Updates API error:", error);

    return res.status(500).json({
      error: "Unable to process updates",
    });
  }
}
