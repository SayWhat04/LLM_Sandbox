import { OpenAIService } from "./OpenAIService";
import { readFileSync } from "fs";
import { join } from "path";

interface VerificationRequest {
  text: string;
  msgID: string;
}

interface VerificationResponse {
  text: string;
  msgID: string;
}

export class VerificationService {
  private openaiService: OpenAIService;
  private apiUrl: string = "https://xyz.ag3nts.org/verify";

  constructor() {
    this.openaiService = new OpenAIService();
  }

  async verify(): Promise<void> {
    try {
      console.log("🤖 Starting verification process...");
      
      // Step 1: Send initial READY request
      const initialRequest: VerificationRequest = {
        text: "READY",
        msgID: "0"
      };

      console.log("📤 Sending initial request:", initialRequest);
      const response1 = await this.sendRequest(initialRequest);
      console.log("📥 Received response with question:", response1);

      // Step 2: Process question with LLM
      const answer = await this.processQuestion(response1.text);
      console.log("🧠 LLM answer:", answer);

      // Step 3: Send answer back
      const answerRequest: VerificationRequest = {
        text: answer,
        msgID: response1.msgID
      };

      console.log("📤 Sending answer request:", answerRequest);
      const response2 = await this.sendRequest(answerRequest);
      console.log("📥 Final response:", response2);

      console.log("✅ Verification process completed successfully!");
    } catch (error) {
      console.error("❌ Error in verification process:", error);
      throw error;
    }
  }

  private async sendRequest(request: VerificationRequest): Promise<VerificationResponse> {
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data as VerificationResponse;
    } catch (error) {
      console.error("Error sending request:", error);
      throw error;
    }
  }

  private async processQuestion(question: string): Promise<string> {
    try {
      // Read memory.txt for context
      const memoryPath = join(__dirname, "memory.txt");
      const memoryContent = readFileSync(memoryPath, "utf-8");

      const messages = [
        {
          role: "system" as const,
          content: `You are a robot following the RoboISO 2230 standard. You have access to the following memory/knowledge base:

${memoryContent}

IMPORTANT: You must respond with ONLY the direct answer to the question. Do not provide explanations, full sentences, or additional context. Just the answer.

Remember the key facts from your memory:
- Capital of Poland is Kraków
- The number from Hitchhiker's Guide to the Galaxy is 69
- Current year is 1999

Answer in English and provide only the direct answer.`
        },
        {
          role: "user" as const,
          content: question
        }
      ];

      const response = await this.openaiService.completion(messages, "gpt-4");
      
      if ("choices" in response) {
        const answer = response.choices[0]?.message?.content?.trim() || "";
        return answer;
      }

      throw new Error("Invalid response format from OpenAI");
    } catch (error) {
      console.error("Error processing question with LLM:", error);
      throw error;
    }
  }
} 