import { GeminiService } from "./GeminiService";
import { MemoryService } from "./MemoryService";

export interface RLMInput {
  prompt: string;
  appId: string;
  mode?: string;
  context: Record<string, unknown>;
}

export interface RLMResult {
  observation: string;
  plan: string;
  action: string;
  reflection: string;
  finalResponse: string;
  answer: string;
  reasoningSummary: string;
  nextAction: string;
}

export class RLMOrchestrator {
  private geminiService: GeminiService;
  private memoryService: MemoryService;

  constructor(geminiService: GeminiService, memoryService: MemoryService) {
    this.geminiService = geminiService;
    this.memoryService = memoryService;
  }

  async run(input: RLMInput): Promise<RLMResult> {
    const observation = await this.observe(input);
    const plan = await this.plan(input, observation);
    const action = await this.act(input, plan);
    const reflection = await this.reflect(input, action);
    const nextAction = await this.suggest(input, action);

    return {
      observation,
      plan,
      action,
      reflection,
      finalResponse: action,
      answer: action,
      reasoningSummary: reflection,
      nextAction,
    };
  }

  private async observe(input: RLMInput): Promise<string> {
    const memories = await this.memoryService.search(input.prompt, input.appId);
    const memoryContext =
      memories.length > 0
        ? memories.map((m) => `[Memory] ${m.content}`).join("\n")
        : "No relevant memories found.";

    const contextStr =
      Object.keys(input.context).length > 0
        ? JSON.stringify(input.context, null, 2)
        : "No additional context.";

    return await this.geminiService.generateContent(
      `You are an observational agent. Summarize the current state based on the following:\n\n` +
        `User prompt: ${input.prompt}\n\n` +
        `Application: ${input.appId}\n\n` +
        `Context: ${contextStr}\n\n` +
        `Relevant memories:\n${memoryContext}\n\n` +
        `Provide a concise observation of the current state.`
    );
  }

  private async plan(input: RLMInput, observation: string): Promise<string> {
    return await this.geminiService.generateContent(
      `You are a planning agent. Based on the observation below, create a step-by-step plan to address the user's prompt.\n\n` +
        `User prompt: ${input.prompt}\n\n` +
        `Observation: ${observation}\n\n` +
        `Provide a clear, numbered plan.`
    );
  }

  private static readonly MODE_INSTRUCTIONS: Record<string, string> = {
    teacher:
      "Use simple language, short sentences, and clear examples suitable for a beginner. Avoid jargon.",
    default: "Provide a thorough, helpful response.",
  };

  private async act(input: RLMInput, plan: string): Promise<string> {
    const modeInstruction =
      (input.mode && RLMOrchestrator.MODE_INSTRUCTIONS[input.mode]) ||
      RLMOrchestrator.MODE_INSTRUCTIONS.default;

    return await this.geminiService.generateContent(
      `You are an action agent. Execute the following plan and provide a complete response to the user's prompt.\n\n` +
        `User prompt: ${input.prompt}\n\n` +
        `Plan: ${plan}\n\n` +
        `Tone instruction: ${modeInstruction}`
    );
  }

  private async suggest(input: RLMInput, answer: string): Promise<string> {
    return await this.geminiService.generateContent(
      `You are a curriculum guide. Based on the question and answer below, suggest one specific next lesson, topic, or action the user should explore.\n\n` +
        `Question: ${input.prompt}\n\n` +
        `Answer summary: ${answer.slice(0, 500)}\n\n` +
        `Respond with a single, concise next step (one sentence, no bullet points).`
    );
  }

  private async reflect(input: RLMInput, action: string): Promise<string> {
    const reflection = await this.geminiService.generateContent(
      `You are a reflective agent. Review the response below and assess its quality.\n\n` +
        `Original prompt: ${input.prompt}\n\n` +
        `Response provided: ${action}\n\n` +
        `Provide a brief reflection: Was the response complete? What could be improved?`
    );

    await this.memoryService.store(
      `Q: ${input.prompt}\nA: ${action}`,
      input.appId,
      `rlm-orchestrator:${new Date().toISOString()}`
    );

    return reflection;
  }
}
