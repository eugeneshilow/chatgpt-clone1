"use server";

import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createStreamableValue } from "ai/rsc";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export interface Chat {
  id: string;
  name: string;
  messages: ChatMessage[];
}

export async function streamMessage(messages: ChatMessage[]) {
  const stream = createStreamableValue("");

  try {
    const { textStream } = await streamText({
      model: openai("gpt-4o"),
      messages: [{ role: "system", content: "You are a helpful assistant." }, ...messages]
    });

    let fullResponse = '';
    for await (const delta of textStream) {
      fullResponse += delta;
      stream.update(fullResponse);
    }

    stream.done();
  } catch (error) {
    console.error("Error in streamMessage:", error);
    stream.error(error);
  }

  return { output: stream.value };
}
