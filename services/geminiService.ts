
import { GoogleGenAI, Type } from "@google/genai";

export const detectFaceInFrame = async (base64Image: string): Promise<boolean> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  // Extract only the base64 part if it contains the data URI prefix
  const base64Data = base64Image.split(',')[1] || base64Image;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            },
            {
              text: "Analyze this image. Is there a clearly visible human face? Answer ONLY with a JSON object: {\"faceDetected\": true/false}"
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            faceDetected: { type: Type.BOOLEAN }
          },
          required: ["faceDetected"]
        }
      }
    });

    const result = JSON.parse(response.text || '{"faceDetected": false}');
    return result.faceDetected;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return false;
  }
};
