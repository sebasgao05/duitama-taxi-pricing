import { configure } from "@vendia/serverless-express";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import app from "./server";

const serverlessHandler = configure({
  app,
  binarySettings: { isBinary: () => false },
});

export const handler = (event: APIGatewayProxyEvent, context: Context) => {
  const stage = event.requestContext?.stage;
  if (stage && event.path.startsWith(`/${stage}`)) {
    event.path = event.path.slice(stage.length + 1) || "/";
  }
  return serverlessHandler(event, context);
};
