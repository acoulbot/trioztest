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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const COMPRESS_MAX_WIDTH = 1920;
const COMPRESS_QUALITY = 80;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);

    if (isImage && !validateImageMagicBytes(buffer, file.type)) {
      return NextResponse.json({ error: "Invalid file format" }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "messages");
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
    } else {
      const ext = (file.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "");
      fileName = `${fileId}.${ext}`;
      finalBuffer = buffer;
    }

    const filePath = path.join(uploadsDir, fileName);
    await writeFile(filePath, finalBuffer);

    const url = `/uploads/messages/${fileName}`;

    return NextResponse.json({
      url,
      name: file.name,
      size: finalBuffer.length,
      type: isImage ? "image/webp" : file.type,
      isImage,
    });
  } catch (error) {
    console.error("[Upload] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
