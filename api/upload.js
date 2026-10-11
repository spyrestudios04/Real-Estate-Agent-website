import { handleUpload } from "@vercel/blob/client";
import process from "node:process";
import { Buffer } from "node:buffer";

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
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (parseErr) {
        console.warn("Failed to parse request body as JSON string:", parseErr);
      }
    } else if (!body) {
      try {
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const raw = Buffer.concat(buffers).toString("utf8");
        if (raw) {
          body = JSON.parse(raw);
        }
      } catch (streamErr) {
        console.warn("Failed to read raw body from request stream:", streamErr);
      }
    }

    if (!body || typeof body !== "object") {
      return res.status(400).json({
        error: "Invalid request payload. Expected JSON body.",
      });
    }

    const result = await handleUpload({
      body,
      request: req,

      onBeforeGenerateToken: async () => {
        if (!isAuthorized(req)) {
          throw new Error("Unauthorized: Invalid or missing admin credentials");
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ],
          maximumSizeInBytes: 4_000_000,
          addRandomSuffix: true,
        };
      },
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Upload handler error:", error);

    const message = error.message || "Image upload failed";
    const isAuthError = message.includes("Unauthorized");
    const isMissingToken =
      message.includes("BLOB_READ_WRITE_TOKEN") ||
      message.includes("No read-write token found") ||
      message.includes("No blob credentials found");

    const statusCode = isAuthError ? 401 : isMissingToken ? 500 : 400;
    const safeError = isMissingToken
      ? "Vercel Blob store is not connected or BLOB_READ_WRITE_TOKEN is missing in Vercel environment variables."
      : isAuthError
      ? "Unauthorized: Admin secret key required or invalid."
      : message;

    return res.status(statusCode).json({
      error: safeError,
    });
  }
}
