import { configure } from "@vendia/serverless-express";
import app from "./server";

const serverlessHandler = configure({
  app,
  binarySettings: { isBinary: () => false },
  resolutionMode: "PROMISE",
}) as unknown as (event: any, context: any) => Promise<any>;

export const handler = async (event: any, context: any) => {
  const stage = event.requestContext?.stage;
  if (stage && typeof event.path === "string" && event.path.startsWith(`/${stage}`)) {
    event.path = event.path.slice(stage.length + 1) || "/";
  }
  return serverlessHandler(event, context);
};
