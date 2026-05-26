import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkBan } from "@/lib/banCheck";
import { rateLimit } from "@/lib/rateLimit";
import { validateImageMagicBytes } from "@/lib/fileValidation";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB for images/audio
const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30 MB for video
const COMPRESS_MAX_WIDTH = 1920;
const COMPRESS_QUALITY = 80;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "upload", { limit: 20, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const banned = await checkBan(session.user.id);
  if (banned) return banned;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type) || file.type.startsWith("video/");
    const sizeLimit = isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;

    if (file.size > sizeLimit) {
      return NextResponse.json(
        { error: isVideo ? "Video too large (max 30MB)" : "File too large (max 10MB)" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isAudio = ALLOWED_AUDIO_TYPES.includes(file.type) || file.type.startsWith("audio/");

    if (isImage && !validateImageMagicBytes(buffer, file.type)) {
      return NextResponse.json({ error: "Invalid file format" }, { status: 400 });
    }

    const subDir = isVideo ? "videos" : isAudio ? "voice" : "messages";
    const uploadsDir = path.join(process.cwd(), "public", "uploads", subDir);
    await mkdir(uploadsDir, { recursive: true });

    const fileId = uuid();
    let fileName: string;
    let finalBuffer: Buffer;

    if (isImage) {
      fileName = `${fileId}.webp`;
      finalBuffer = await sharp(buffer)
        .resize(COMPRESS_MAX_WIDTH, COMPRESS_MAX_WIDTH, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: COMPRESS_QUALITY })
        .toBuffer();
    } else if (isVideo) {
      const ext = file.type.includes("webm") ? "webm" : file.type.includes("quicktime") ? "mov" : file.type.includes("matroska") ? "mkv" : "mp4";
      fileName = `${fileId}.${ext}`;
      finalBuffer = buffer;
    } else if (isAudio) {
      const ext = file.type.includes("webm") ? "webm" : file.type.includes("ogg") ? "ogg" : file.type.includes("mp4") ? "m4a" : "webm";
      fileName = `${fileId}.${ext}`;
      finalBuffer = buffer;
    } else {
      const ext = (file.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "");
      fileName = `${fileId}.${ext}`;
      finalBuffer = buffer;
    }

    const filePath = path.join(uploadsDir, fileName);
    await writeFile(filePath, finalBuffer);

    const url = `/uploads/${subDir}/${fileName}`;

    const duration = formData.get("duration");

    return NextResponse.json({
      url,
      name: file.name,
      size: finalBuffer.length,
      type: isImage ? "image/webp" : file.type,
      isImage,
      isVideo,
      isVoice: isAudio,
      ...(duration ? { duration: Number(duration) } : {}),
    });
  } catch (error) {
    console.error("[Upload] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
