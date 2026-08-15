const fs = require('fs');
const path = require('path');

// Read API keys from env
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const openaiKey = envContent.match(/OPENAI_API_KEY=(.+)/)?.[1]?.trim();

if (!openaiKey) {
  console.error("No OPENAI_API_KEY found in .env.local");
  process.exit(1);
}

const imageUrl = "https://instagram.fcjs4-1.fna.fbcdn.net/v/t51.82787-15/730294309_18097772639586158_1433079412118825815_n.webp?stp=dst-jpg_e35_p1080x1080_sh2.08_tt6&_nc_ht=instagram.fcjs4-1.fna.fbcdn.net&_nc_cat=102&_nc_oc=Q6cZ2gEkA1EXDGT-tfaJpZoXbvBJ9JBXxwagED7joqpN-uiBSM5hzQhEkMOpbx5JGhRxDIrUoGBMdc07AyOXlNw3UA1Y&_nc_ohc=CKJvhbcLGbQQ7kNvwFsfIbn&_nc_gid=HDHCI6HWp-WMw4KmmUe0Pg&edm=ADp7STQBAAAA&ccb=7-5&oh=00_AQHp-PEedRNctd3xbKG6zdFGle5i3kRxwbg1lIQgzvClEg&oe=6A86B914&_nc_sid=c6f216";

async function downloadAndEncode(url) {
  console.log("Downloading image to base64...");
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

async function run() {
  const base64Image = await downloadAndEncode(imageUrl);
  
  console.log("Sending base64 image to GPT-4o mini for extraction...");
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert at identifying kids' events from images. 
Analyze this image from an Instagram post and extract any events. 
Return a JSON object matching this schema:
{
  "isEvent": boolean,
  "events": [
    {
      "title": string,
      "startDate": string, // YYYY-MM-DD, assume year is 2026 unless specified
      "endDate": string, // YYYY-MM-DD or null
      "startTime": string, // HH:MM or null
      "endTime": string, // HH:MM or null
      "location": string, // City/address or venue name
      "ageRange": string, // e.g. "0-4 years"
      "cost": string, // e.g. "Free" or price
      "description": string
    }
  ]
}
If no events are present, return { "isEvent": false, "events": [] }.`
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image
              }
            }
          ]
        }
      ]
    })
  });

  const data = await response.json();
  if (data.error) {
    console.error("OpenAI Error:", data.error);
  } else {
    console.log("GPT-4o Mini Response:\n");
    console.log(JSON.stringify(JSON.parse(data.choices[0].message.content), null, 2));
  }
}

run().catch(console.error);
