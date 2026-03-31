import { configure } from "@vendia/serverless-express";
import app from "./server";

export const handler = configure({ app });
