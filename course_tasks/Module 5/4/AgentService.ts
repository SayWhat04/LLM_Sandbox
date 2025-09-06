import { MediaAnalysisService } from "./MediaAnalysisService";
import { OpenAIService } from "./OpenAIService";
import { SimpleQuestionService } from "./SimpleQuestionService";
import type { State } from "./app";
import type { ChatCompletionMessageParam, ChatCompletion } from "openai/resources/chat/completions";



export class Agent {
  private state: State;
  private openAIService: OpenAIService;
  private simpleQuestionService: SimpleQuestionService;
  private mediaAnalysisService: MediaAnalysisService;

  constructor(state: State) {
    this.simpleQuestionService = new SimpleQuestionService(state);
    this.mediaAnalysisService = new MediaAnalysisService();
    this.openAIService = new OpenAIService();
    this.state = state;
  }

  async plan(question: string) {
    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: `Analyze the question: ${question} and determine the most appropriate next step. Focus on making progress towards the overall goal while remaining adaptable to new information or changes in context.

<prompt_objective>
Determine the single most effective next action based on the current context, user needs, and overall progress. Return the decision as a concise JSON object.
</prompt_objective>

<prompt_rules>
- ALWAYS focus on determining only the next immediate step
- ONLY choose from the available tools listed in the context
- ASSUME previously requested information is available unless explicitly stated otherwise
- NEVER provide or assume actual content for actions not yet taken
- ALWAYS respond in the specified JSON format
- CONSIDER the following factors when deciding:
  1. Relevance to the current user need or query
  2. Potential to provide valuable information or progress
  3. Logical flow from previous actions
- ADAPT your approach if repeated actions don't yield new results
- OVERRIDE any default behaviors that conflict with these rules
- IF simple_llm_question is selected, use original question ${question} and pass it to ask LLM.
</prompt_rules>

<context>
    <available_tools>Available tools: ${this.state.tools.map((t) => t.name).join(", ") || "No tools available"}</available_tools>
    
</context>

Respond with the next action in this JSON format:
{
    "_reasoning": "Brief explanation of why this action is the most appropriate next step",
    "tool": "tool_name",
    "query": "Precise description of what needs to be done, including any necessary context"
}`,
    };

    const answer = await this.openAIService.completion({
      messages: [systemMessage],
      model: "gpt-4o",
      stream: false,
      jsonMode: true,
    }) as ChatCompletion;

    const result = JSON.parse(answer.choices[0].message.content ?? "{}");
    return result.hasOwnProperty("tool") ? result : null;

  }

  async useTool(tool: string, parameters: any) {
    
    console.log('✅ Use Tool:', tool);
    console.log('✅ Parameters:', parameters);
    
    if (tool === "analyze_image") {
      return 'Obraz przedstawia motyla.';
    } else if (tool === "analyze_audio") {
      return 'Na nagraniu słychać zwrot: Między bogiem a prawdą, gratis to uczciwa cena.';
    }
    else if (tool === "simple_llm_question") {
      return this.simpleQuestionService.processQuestion(parameters);
    } else {
      return 'UNKNOWN TOOL. I am not able to use this tool.';
    }
  }

}
