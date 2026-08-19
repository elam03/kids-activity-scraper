import { prisma } from './prisma';

export interface ExtractedEvent {
  title: string;
  startDate: string;      // YYYY-MM-DD
  endDate?: string;        // YYYY-MM-DD
  startTime?: string;      // HH:MM
  endTime?: string;        // HH:MM
  location?: string;
  ageRange?: string;
  category: "sports" | "arts" | "nature" | "music" | "education" | "festival" | "other";
  cost?: string;
  isFree: boolean;
  registrationUrl?: string;
  description: string;
}

export interface ExtractionResult {
  isEvent: boolean;
  confidence: number; // 0.0 - 1.0
  events: ExtractedEvent[];
}

// Download image CDN url and return as base64 data URL
async function downloadImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:image/webp;base64,${base64}`;
}

// Perform event extraction using OpenAI GPT-4o mini
export async function extractEventsFromPost(
  postUrl: string,
  type: string,
  caption: string | null,
  displayUrl: string,
  childPosts: Array<{ displayUrl: string }>,
  sourceId: string
): Promise<ExtractionResult> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  const currentDate = new Date().toISOString().split('T')[0];
  let messages: any[] = [];

  const promptText = `You are an expert at identifying kids' events from social media posts.
Analyze the provided information and extract any events.
Assume the current date is ${currentDate} (use the current year 2026 unless the text specifies a different year).
Return a JSON object strictly matching this schema:
{
  "isEvent": boolean,
  "confidence": number, // float between 0.0 and 1.0 indicating extraction quality
  "events": [
    {
      "title": string,
      "startDate": string, // YYYY-MM-DD
      "endDate": string or null, // YYYY-MM-DD
      "startTime": string or null, // HH:MM (24-hour format)
      "endTime": string or null, // HH:MM (24-hour format)
      "location": string or null, // City/venue name
      "ageRange": string or null, // e.g. "0-4 years"
      "category": "sports" | "arts" | "nature" | "music" | "education" | "festival" | "other",
      "cost": string or null, // e.g. "Free" or price details
      "isFree": boolean, // true if free event, false otherwise
      "registrationUrl": string or null,
      "description": string
    }
  ]
}
If no events are present in the post, return { "isEvent": false, "confidence": 1.0, "events": [] }.`;

  if (type === "Sidecar" && childPosts.length > 0) {
    // Vision model: Download all slide images and pass as base64
    console.log(`Sidecar post detected. Downloading ${childPosts.length} slides for vision parsing...`);
    const contentPayload: any[] = [{ type: "text", text: promptText }];
    
    // Include caption if present to add context
    if (caption) {
      contentPayload.push({ type: "text", text: `Post Caption:\n${caption}` });
    }

    // Limit to max 10 slides to avoid hitting payload/rate limits
    const slidesToProcess = childPosts.slice(0, 10);
    for (let i = 0; i < slidesToProcess.length; i++) {
      try {
        const base64Img = await downloadImageAsBase64(slidesToProcess[i].displayUrl);
        contentPayload.push({
          type: "image_url",
          image_url: { url: base64Img }
        });
      } catch (err) {
        console.error(`Failed to download slide ${i}:`, err);
      }
    }

    messages.push({ role: "user", content: contentPayload });
  } else {
    // Text-only model for standard posts
    console.log("Image/Video post detected. Performing text-only parsing...");
    messages.push({
      role: "user",
      content: `${promptText}\n\nPost Caption:\n${caption || ""}\n(Primary Image Alt/Caption placeholder: ${displayUrl})`
    });
  }

  // Trigger GPT-4o mini request
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API failed: ${response.status} ${response.statusText} - ${errText}`);
  }

  const resultData = await response.json();
  const rawContent = resultData.choices[0].message.content;
  const parsed = JSON.parse(rawContent) as ExtractionResult;

  // South Bay cities list for geographic checks
  const southBayCities = [
    'san jose', 'santa clara', 'sunnyvale', 'cupertino', 'milpitas',
    'campbell', 'los gatos', 'mountain view', 'saratoga', 'morgan hill', 'gilroy'
  ];

  // Save results to database
  if (parsed.isEvent && parsed.events.length > 0) {
    for (const rawEvent of parsed.events) {
      // 1. Past Date Ignore Filter
      if (rawEvent.startDate < currentDate) {
        console.log(`Skipping past event: ${rawEvent.title} (${rawEvent.startDate})`);
        continue;
      }

      // 2. Geographic Routing Check
      const eventLocation = (rawEvent.location || '').toLowerCase();
      const isSouthBay = southBayCities.some(city => eventLocation.includes(city));
      
      // Default to "approved" if confidence is high AND it's in the South Bay, otherwise route to "pending" review queue
      let status = parsed.confidence >= 0.8 && isSouthBay ? "approved" : "pending";

      await prisma.event.upsert({
        where: {
          rawPostUrl_title: {
            rawPostUrl: postUrl,
            title: rawEvent.title
          }
        },
        update: {
          startDate: rawEvent.startDate,
          endDate: rawEvent.endDate || null,
          startTime: rawEvent.startTime || null,
          endTime: rawEvent.endTime || null,
          location: rawEvent.location || null,
          ageRange: rawEvent.ageRange || null,
          category: rawEvent.category,
          cost: rawEvent.cost || null,
          isFree: rawEvent.isFree,
          registrationUrl: rawEvent.registrationUrl || null,
          status,
          confidence: parsed.confidence,
        },
        create: {
          source: { connect: { id: sourceId } },
          rawPostUrl: postUrl,
          rawCaption: caption || "",
          title: rawEvent.title,
          startDate: rawEvent.startDate,
          endDate: rawEvent.endDate || null,
          startTime: rawEvent.startTime || null,
          endTime: rawEvent.endTime || null,
          location: rawEvent.location || null,
          ageRange: rawEvent.ageRange || null,
          category: rawEvent.category,
          cost: rawEvent.cost || null,
          isFree: rawEvent.isFree,
          registrationUrl: rawEvent.registrationUrl || null,
          status,
          confidence: parsed.confidence,
        }
      });
    }
  } else {
    // If not an event, save a rejected placeholder event to avoid re-processing in future runs
    await prisma.event.upsert({
      where: {
        rawPostUrl_title: {
          rawPostUrl: postUrl,
          title: "Non-event"
        }
      },
      update: { status: "rejected" },
      create: {
        source: { connect: { id: sourceId } },
        rawPostUrl: postUrl,
        rawCaption: caption || "",
        title: "Non-event",
        startDate: currentDate,
        category: "other",
        status: "rejected",
        confidence: parsed.confidence,
      }
    });
  }

  return parsed;
}
