import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { FakeSummarizationProvider } from "./fake-summarization.provider";
import { GeminiSummarizationProvider } from "./gemini-summarization.provider";
import { SUMMARIZATION_PROVIDER } from "./summarization-provider.interface";

@Module({
  providers: [
    FakeSummarizationProvider,
    GeminiSummarizationProvider,
    {
      provide: SUMMARIZATION_PROVIDER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>("NODE_ENV");
        const geminiApiKey = configService.get<string>("GEMINI_API_KEY");

        console.log(
          `[LlmModule] Initializing. NODE_ENV: ${nodeEnv}, GEMINI_API_KEY present: ${!!geminiApiKey}`,
        );

        // Use fake provider for tests or when no API key is provided
        if (nodeEnv === "test" || !geminiApiKey) {
          return new FakeSummarizationProvider();
        }

        return new GeminiSummarizationProvider(configService);
      },
    },
  ],
  exports: [
    SUMMARIZATION_PROVIDER,
    FakeSummarizationProvider,
    GeminiSummarizationProvider,
  ],
})
export class LlmModule {}
