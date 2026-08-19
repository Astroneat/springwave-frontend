import { get, post, del } from "./client.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gửi tin nhắn chatbot trực tiếp tới backend.
 */
export async function sendChatMessage(message, history) {
  return await post("/chatbot/chat", { message, history }, { priority: true, timeout: 60000 });
}

export function fetchChatHistory() {
  return get("/chatbot/history");
}

export function clearChatHistory() {
  return del("/chatbot/history");
}
