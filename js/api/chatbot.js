import { get, post, del } from "./client.js";

export function sendChatMessage(message, history) {
  return post("/chatbot/chat", { message, history });
}

export function fetchChatHistory() {
  return get("/chatbot/history");
}

export function clearChatHistory() {
  return del("/chatbot/history");
}
