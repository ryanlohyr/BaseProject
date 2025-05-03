import { Request, Response, Router, Express } from "express";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
require("dotenv").config();

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

interface StreamTextRequestBody {
  messages: any; // Adjust the type of messages as needed
}

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

function chatRoutes(app: Express) {
  const router = Router();

  const prefix = "/chat"; // Define your prefix here
  router.post(
    "/stream-text",
    async (req: Request<{}, {}, StreamTextRequestBody>, res: Response) => {
      const { messages } = req.body; // Destructure messages from req.body

      // add a system message to the messages
      const allMessages = [
        {
          role: "system",
          content:
            "Your name is Marky, a world class Education Assistant. You are given a task to help the user with their education. You are also given a list of tools that you can use to help the user.",
        },
        ...messages,
      ];
      console.log("req.body here", messages);

      const result = streamText({
        model: openai("gpt-4o"),
        messages: allMessages,
        tools: {
          // server-side tool with execute function
          getWeatherInformation: {
            description: "show the weather in a given city to the user",
            parameters: z.object({ city: z.string() }),
            execute: async ({ city }: { city: string }) => {
              console.log("city", city);

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

  router.get("/", (req: Request, res: Response) => {
    res.send("Hello World!");
  });

  app.use(prefix, router);
}

export default chatRoutes;
