import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { EFFORT, MAX_TOKENS, MODEL } from "./config";
import { ModelCallError, type ModelCall, type ModelClient } from "./model";
import { ASSESS_SYSTEM, assessUser, DRAFT_SYSTEM, draftUser } from "./prompts";
import { AssessmentSchema, DraftSchema } from "./types";

/**
 * The live model: Claude through the Anthropic SDK, with structured (JSON) output.
 * Reads ANTHROPIC_API_KEY from the environment. Errors and refusals throw; the pipeline
 * then falls back to the rules-only stub for that call and records why.
 * Uses create() and validates the JSON here (instead of parse()) so the usage of a call
 * that fails validation is still known and counted toward the run's cost.
 */
export function claudeModel(client = new Anthropic()): ModelClient {
  async function call<S extends z.ZodType>(
    system: string,
    user: string,
    schema: S,
    effort: "low" | "medium" | "high",
    maxTokens: number,
  ): Promise<ModelCall<z.infer<S>>> {
    const started = Date.now();
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      // If a safety classifier declines, the API retries on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort, format: betaZodOutputFormat(schema) },
    });
    const usage = {
      inputTokens: res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0) + (res.usage.cache_creation_input_tokens ?? 0),
      outputTokens: res.usage.output_tokens,
      latencyMs: Date.now() - started,
    };
    if (res.stop_reason === "refusal") throw new ModelCallError(`refused (${res.stop_details?.category ?? "no category"})`, usage);
    if (res.stop_reason === "max_tokens") throw new ModelCallError(`hit max_tokens (${maxTokens})`, usage);
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new ModelCallError(`invalid JSON (stop_reason ${res.stop_reason}): ${(e as Error).message}`, usage);
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) throw new ModelCallError(`output failed schema: ${parsed.error.message.slice(0, 200)}`, usage);
    return { value: parsed.data, usage };
  }

  return {
    name: MODEL,
    assess: (t, retrieved, articles) =>
      call(ASSESS_SYSTEM, assessUser(t, retrieved, articles), AssessmentSchema, EFFORT.assess, MAX_TOKENS.assess),
    draft: (t, retrieved, articles, d, a) =>
      call(DRAFT_SYSTEM, draftUser(t, retrieved, articles, d, a), DraftSchema, EFFORT.draft, MAX_TOKENS.draft),
  };
}
