const express = require("express");
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import cors from "cors";
import { Request, Response } from "express";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const app = express();
const port = 8080;

const openai = createOpenAI({
  apiKey:
    "",
});

app.use(
  cors({
    origin: "http://localhost:3001",
  })
);

app.use(express.json());

app.get("/", (req: any, res: any) => {
  res.send("Hello World!");
});

// Define the expected shape of the request body
interface StreamTextRequestBody {
  messages: any; // Adjust the type of messages as needed
}

app.post(
  "/stream-text",
  async (req: Request<{}, {}, StreamTextRequestBody>, res: Response) => {
    const { messages } = req.body; // Destructure messages from req.body

    console.log("req.body", messages);

    const result = streamText({
      model: openai("gpt-4o"),
      messages,
      tools: {
        // server-side tool with execute function
        getWeatherInformation: {
          description: "show the weather in a given city to the user",
          parameters: z.object({ city: z.string() }),
          execute: async ({ city }: { city: string }) => {
            const weatherOptions = [
              "sunny",
              "cloudy",
              "rainy",
              "snowy",
              "windy",
            ];
            return weatherOptions[
              Math.floor(Math.random() * weatherOptions.length)
            ];
          },
        },
        // client-side tool that starts user interaction:
        askForConfirmation: {
          description: "Ask the user for confirmation.",
          parameters: z.object({
            message: z
              .string()
              .describe("The message to ask for confirmation."),
          }),
        },
        // client-side tool that is automatically executed on the client:
        getLocation: {
          description:
            "Get the user location. Always ask for confirmation before using this tool.",
          parameters: z.object({}),
        },
      },
    });

    // Convert result to a data stream and pipe it to the response
    const dataStream = await result.toDataStream();
    res.setHeader("Content-Type", "text/event-stream");
    const writableStream = new WritableStream({
      write(chunk) {
        res.write(chunk);
      },
    });
    await dataStream.pipeTo(writableStream);
  }
);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
