// /api/internal-proxy/route.ts - Optional internal XML proxy endpoint

import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("Internal XML proxy processing...");
    
    // Ambil XML data dari request body
    const xmlData = await req.text();
    
    if (!xmlData || !xmlData.includes('<?xml')) {
      return Response.json({ 
        error: "Invalid XML data",
        received: xmlData.substring(0, 100) + "..." 
      }, { status: 400 });
    }

    // Parse XML untuk mendapatkan data yang diperlukan
    const visitorIdMatch = xmlData.match(/<visitorId>(.*?)<\/visitorId>/);
    const fileDataMatch = xmlData.match(/<data>(.*?)<\/data>/);
    const fileNameMatch = xmlData.match(/<n>(.*?)<\/n>/);
    const contentTypeMatch = xmlData.match(/<type>(.*?)<\/type>/);

    if (!visitorIdMatch || !fileDataMatch || !fileNameMatch || !contentTypeMatch) {
      return Response.json({
        error: "Missing required fields in XML",
        fields: {
          visitorId: !!visitorIdMatch,
          fileData: !!fileDataMatch,
          fileName: !!fileNameMatch,
          contentType: !!contentTypeMatch
        }
      }, { status: 400 });
    }

    const visitorId = visitorIdMatch[1];
    const base64Data = fileDataMatch[1];
    const fileName = fileNameMatch[1];
    const contentType = contentTypeMatch[1];

    console.log("Parsed XML data:", { 
      visitorId, 
      fileName, 
      contentType,
      dataSize: base64Data.length 
    });

    // Convert base64 kembali ke binary untuk dikirim ke videy
    const binaryData = Buffer.from(base64Data, 'base64');
    
    // Buat FormData untuk videy API
    const formData = new FormData();
    const blob = new Blob([binaryData], { type: contentType });
    formData.append('file', blob, fileName);

    console.log("Sending to Videy API...");

    // Kirim ke videy API
    const videyResponse = await fetch(`https://videy.co/api/upload?visitorId=${visitorId}`, {
      method: "POST",
      body: formData,
    });

    const responseText = await videyResponse.text();

    if (!videyResponse.ok) {
      console.error("Videy API error:", responseText);
      return Response.json({
        error: "Videy upload failed",
        details: responseText,
        status: videyResponse.status
      }, { status: 500 });
    }

    // Parse JSON response dari videy
    let videyData;
    try {
      videyData = JSON.parse(responseText);
      console.log("Videy response:", videyData);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return Response.json({
        error: "Invalid JSON response from videy",
        response: responseText
      }, { status: 500 });
    }

    // Return success response
    return Response.json({
      success: true,
      id: videyData.id || '',
      link: videyData.link || '',
      processedAt: new Date().toISOString(),
      method: "XML-to-Videy proxy"
    });

  } catch (error) {
    console.error("Internal proxy error:", error);
    
    return Response.json({
      error: "Internal proxy server error",
      details: (error as Error).message
    }, { status: 500 });
  }
}