import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET!;

export const config = {
  api: {
    bodyParser: false,
  },
};

// Fungsi untuk membuat XML request
function createXMLRequest(visitorId: string, fileData: string, fileName: string, contentType: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<uploadRequest>
  <visitorId>${visitorId}</visitorId>
  <file>
    <name>${fileName}</name>
    <type>${contentType}</type>
    <data>${fileData}</data>
  </file>
  <timestamp>${new Date().toISOString()}</timestamp>
</uploadRequest>`;
}

// Fungsi untuk parse XML dan kirim ke Videy
async function processXMLToVidey(xmlData: string): Promise<any> {
  try {
    // Parse XML data
    const visitorIdMatch = xmlData.match(/<visitorId>(.*?)<\/visitorId>/);
    const fileDataMatch = xmlData.match(/<data>(.*?)<\/data>/);
    const fileNameMatch = xmlData.match(/<name>(.*?)<\/name>/);
    const contentTypeMatch = xmlData.match(/<type>(.*?)<\/type>/);

    if (!visitorIdMatch || !fileDataMatch || !fileNameMatch || !contentTypeMatch) {
      throw new Error('Invalid XML format');
    }

    const visitorId = visitorIdMatch[1];
    const base64Data = fileDataMatch[1];
    const fileName = fileNameMatch[1];
    const contentType = contentTypeMatch[1];

    // Convert base64 kembali ke binary
    const binaryData = Buffer.from(base64Data, 'base64');
    
    // Buat FormData untuk Videy API
    const formData = new FormData();
    const blob = new Blob([binaryData], { type: contentType });
    formData.append('file', blob, fileName);

    // Kirim ke Videy API
    const videyResponse = await fetch(`https://videy.co/api/upload?visitorId=${visitorId}`, {
      method: "POST",
      body: formData,
    });

    const responseText = await videyResponse.text();

    if (!videyResponse.ok) {
      throw new Error(`Videy upload failed: ${responseText}`);
    }

    // Parse JSON response dari Videy
    return JSON.parse(responseText);

  } catch (error) {
    throw new Error(`XML processing failed: ${(error as Error).message}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validasi session
    const cookieStore = await cookies();
    const token = cookieStore.get("vipeysession")?.value;
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return Response.json({ error: "Invalid session" }, { status: 403 });
    }

    // Generate visitor ID
    const visitorId = uuidv4();

    // Ambil file data dari request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to base64 untuk XML
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    
    // Buat XML request (internal processing)
    const xmlRequest = createXMLRequest(
      visitorId, 
      base64Data, 
      file.name, 
      file.type
    );

    console.log("Processing XML request internally...");
    
    // Proses XML secara internal dan kirim ke Videy
    const videyData = await processXMLToVidey(xmlRequest);
    
    if (!videyData.id || !videyData.link) {
      return Response.json({ 
        error: "Invalid response from upload service" 
      }, { status: 500 });
    }

    // Simpan ke database
    await prisma.video.create({
      data: {
        videoId: videyData.id,
        userId: payload.userId,
      },
    });

    console.log("Upload successful:", { id: videyData.id, link: videyData.link });

    return Response.json({ 
      link: videyData.link,
      id: videyData.id,
      message: "Upload processed via XML method"
    });

  } catch (err) {
    console.error("Upload error:", err);
    return Response.json(
      { 
        error: "Upload failed", 
        details: (err as Error).message 
      },
      { status: 500 }
    );
  }
}