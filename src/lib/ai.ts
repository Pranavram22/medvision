import { env } from '@/env';

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }[];
  created: number;
  model: string;
}

export class AIService {
  private static readonly API_URL = 'https://openrouter.ai/api/v1';
  private static readonly MODEL = 'google/gemini-pro-vision';

  private static async makeRequest(endpoint: string, body: any) {
    const response = await fetch(`${this.API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'MedVision AI Diagnostics',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to communicate with AI service');
    }

    return response.json();
  }

  static async analyzeMedicalImage(
    imageBase64: string,
    prompt: string = "Analyze this medical image and provide a detailed assessment of any visible abnormalities, potential diagnoses, and areas of concern. Please be thorough and specific in your observations."
  ): Promise<string> {
    try {
      const body = {
        model: this.MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      };

      const response = await this.makeRequest('/chat/completions', body) as OpenRouterResponse;
      return response.choices[0].message.content;
    } catch (error) {
      console.error('AI analysis error:', error);
      throw error;
    }
  }

  static async getFollowUpQuestions(
    analysis: string,
    previousQuestions: string[] = []
  ): Promise<string[]> {
    try {
      const prompt = `Based on this medical analysis: "${analysis}", and considering these previous questions have already been asked: [${previousQuestions.join(
        ', '
      )}], what are the 3 most important follow-up questions that a medical professional should ask? Format the response as a JSON array of strings.`;

      const body = {
        model: 'google/gemini-pro',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      };

      const response = await this.makeRequest('/chat/completions', body) as OpenRouterResponse;
      const content = response.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch {
        // If the AI didn't return proper JSON, try to extract questions from the text
        return content
          .split('\n')
          .filter(line => line.trim().endsWith('?'))
          .slice(0, 3);
      }
    } catch (error) {
      console.error('Follow-up questions error:', error);
      throw error;
    }
  }

  static async getSummaryAndRecommendations(
    analysis: string,
    followUpAnswers: Record<string, string>
  ): Promise<{ summary: string; recommendations: string[] }> {
    try {
      const followUpContext = Object.entries(followUpAnswers)
        .map(([q, a]) => `Q: ${q}\nA: ${a}`)
        .join('\n');

      const prompt = `Based on this medical image analysis: "${analysis}" and these follow-up responses:\n${followUpContext}\n\nProvide a comprehensive summary and list of recommendations. Format the response as a JSON object with two fields: "summary" (string) and "recommendations" (array of strings).`;

      const body = {
        model: 'google/gemini-pro',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      };

      const response = await this.makeRequest('/chat/completions', body) as OpenRouterResponse;
      const content = response.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch {
        // If the AI didn't return proper JSON, return a formatted version of the raw text
        const lines = content.split('\n').filter(Boolean);
        return {
          summary: lines[0] || 'No summary available',
          recommendations: lines.slice(1).map(line => line.replace(/^[•\-*]\s*/, '')),
        };
      }
    } catch (error) {
      console.error('Summary and recommendations error:', error);
      throw error;
    }
  }
} 