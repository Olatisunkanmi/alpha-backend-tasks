import "dotenv/config";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CandidateSummaryInput,
  CandidateSummaryResult,
  SummarizationProvider,
  RecommendedDecision,
} from "./summarization-provider.interface";
import { promptBuild } from "./prompt-guide";

@Injectable()
export class GeminiSummarizationProvider implements SummarizationProvider {
  private readonly logger = new Logger(GeminiSummarizationProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly promptVersion = "v1.0";

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY") ?? "";
    this.model = "gemini-3-flash-preview";

    this.logger.log(
      `Initializing Gemini Provider. API Key present: ${!!this.apiKey}`,
    );

    if (!this.apiKey) {
      this.logger.warn(
        "GEMINI_API_KEY not configured properly - falling back to fake responses",
      );
    }
  }

  async generateCandidateSummary(
    input: CandidateSummaryInput,
  ): Promise<CandidateSummaryResult> {
    try {
      const prompt = this.buildPrompt(input);

      const response = await this.callGeminiAPI(prompt);

      return this.parseAndValidateResponse(response);
    } catch (error: any) {
      console.log(error);
      this.logger.error("Failed to generate summary with Gemini", error);
      throw new Error(`LLM summarization failed: ${error.message}`);
    }
  }

  private buildPrompt(input: CandidateSummaryInput): string {
    const documentsText = input.documents.join("\n\n---\n\n");

    return `${promptBuild} Documents:${documentsText}`;
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(
        `Gemini API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content
    ) {
      throw new Error("Invalid response structure from Gemini API");
    }

    return data.candidates[0].content.parts[0].text;
  }

  private parseAndValidateResponse(
    responseText: string,
  ): CandidateSummaryResult {
    let parsed: any;

    console.log("responseText", responseText);

    try {
      const cleanedResponse = responseText
        .trim()
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .replace(/^\s*```\s*json\s*/g, "")
        .replace(/```\s*$/g, "");
      parsed = JSON.parse(cleanedResponse);
    } catch (error) {
      throw new Error("LLM response is not valid JSON");
    }

    if (
      typeof parsed.score !== "number" ||
      parsed.score < 0 ||
      parsed.score > 100
    ) {
      throw new Error("Invalid score: must be a number between 0-100");
    }

    if (
      !Array.isArray(parsed.strengths) ||
      !parsed.strengths.every((s: any) => typeof s === "string")
    ) {
      throw new Error("Invalid strengths: must be an array of strings");
    }

    if (
      !Array.isArray(parsed.concerns) ||
      !parsed.concerns.every((c: any) => typeof c === "string")
    ) {
      throw new Error("Invalid concerns: must be an array of strings");
    }

    if (typeof parsed.summary !== "string") {
      throw new Error("Invalid summary: must be a string");
    }

    const validDecisions: RecommendedDecision[] = ["advance", "hold", "reject"];
    if (!validDecisions.includes(parsed.recommendedDecision)) {
      throw new Error(
        'Invalid recommendedDecision: must be "advance", "hold", or "reject"',
      );
    }

    return {
      score: parsed.score,
      strengths: parsed.strengths,
      concerns: parsed.concerns,
      summary: parsed.summary,
      recommendedDecision: parsed.recommendedDecision,
    };
  }
}
