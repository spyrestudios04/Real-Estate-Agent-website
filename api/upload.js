import { handleUpload } from "@vercel/blob/client";
import process from "node:process";

function isAuthorized(req) {
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) return true;
  const provided =
    req.headers["x-admin-secret"] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "");
  return provided === secret;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const result = await handleUpload({
      body: req.body,
      request: req,

      onBeforeGenerateToken: async () => {
        if (!isAuthorized(req)) {
          throw new Error("Unauthorized");
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
          ],
          maximumSizeInBytes: 4_000_000,
          addRandomSuffix: true,
        };
      },

      onUploadCompleted: async () => {},
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Upload error:", error);

    const isAuthError = error.message?.includes("Unauthorized");
    return res.status(isAuthError ? 401 : 400).json({
      error: error.message || "Image upload failed",
    });
  }
}
