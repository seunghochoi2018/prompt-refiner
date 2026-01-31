import { NextRequest, NextResponse } from "next/server";

// Share page domains that won't work
const SHARE_PAGE_DOMAINS = [
  "gemini.google.com",
  "chatgpt.com",
  "chat.openai.com",
  "midjourney.com",
  "leonardo.ai",
  "civitai.com/images", // gallery pages, not direct images
  "reddit.com",
  "twitter.com",
  "x.com",
];

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "No URL provided" },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Check if it's a share page that won't work
    const isSharePage = SHARE_PAGE_DOMAINS.some(domain =>
      parsedUrl.hostname.includes(domain.split("/")[0]) &&
      (domain.includes("/") ? parsedUrl.pathname.includes(domain.split("/")[1]) : true)
    );

    if (isSharePage) {
      return NextResponse.json(
        { error: "This is a share page, not a direct image URL. Please download the image and upload it directly, or right-click the image and copy the image address." },
        { status: 400 }
      );
    }

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: Server returned ${response.status}. The URL may be private or expired.` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      // Check if it's HTML (likely a webpage, not an image)
      if (contentType?.includes("text/html")) {
        return NextResponse.json(
          { error: "This URL points to a webpage, not an image. Please use a direct image URL (usually ends in .jpg, .png, .webp) or download and upload directly." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `URL does not point to an image (received: ${contentType || "unknown"})` },
        { status: 400 }
      );
    }

    // Convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const imageData = `data:${contentType};base64,${base64}`;

    return NextResponse.json({ imageData });
  } catch (error) {
    console.error("Fetch image error:", error);
    return NextResponse.json(
      { error: "Failed to fetch image. The URL may be blocked or inaccessible." },
      { status: 500 }
    );
  }
}
