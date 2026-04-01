import { configure } from "@vendia/serverless-express";
import app from "./server";

const serverlessHandler = configure({
  app,
  binarySettings: { isBinary: () => false },
});

export const handler = (event: any, context: any, callback: any) => {
  const stage = event.requestContext?.stage;
  if (stage && typeof event.path === "string" && event.path.startsWith(`/${stage}`)) {
    event.path = event.path.slice(stage.length + 1) || "/";
  }
  return serverlessHandler(event, context, callback);
};
