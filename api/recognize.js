
export const config = {
  api: { bodyParser: { sizeLimit: "5mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(500).json({
      error: "OPENAI_API_KEY सेट नहीं है।"
    });
  }

  try {
    const { imageData } = req.body || {};

    if (
      typeof imageData !== "string" ||
      !imageData.startsWith("data:image/")
    ) {
      return res.status(400).json({
        error: "कृपया सही डॉक्यूमेंट फोटो अपलोड करें।"
      });
    }

    const prompt = `Read this document image carefully.
Transcribe all text in its original language.
Preserve names, dates, numbers, amounts, headings and table rows.
Do not guess or invent missing text.
Mark unreadable parts as [अस्पष्ट].
Return only the transcribed document text.`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          input: [{
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              {
                type: "input_image",
                image_url: imageData,
                detail: "high"
              }
            ]
          }]
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: result?.error?.message || "AI API request failed"
      });
    }

    const text = (result.output || [])
      .flatMap(item => item.content || [])
      .filter(part => part.type === "output_text")
      .map(part => part.text)
      .join("\n").trim();

    return res.status(200).json({ text });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
}
