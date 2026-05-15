import { post } from "./client.js";

export function sendChatMessage(message, history) {
  return post("/chatbot/chat", { message, history });
}
