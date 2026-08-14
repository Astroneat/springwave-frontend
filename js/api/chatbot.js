import { get, post, del } from "./client.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gửi tin nhắn chatbot với cơ chế tự động thử lại (Auto-Retry) khi gặp chập chờn mạng trên Web.
 */
export async function sendChatMessage(message, history, maxRetries = 1) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await post("/chatbot/chat", { message, history });
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await sleep(1000); // Chờ 1 giây và thử lại nếu gặp lỗi mạng tạm thời
      }
    }
  }
  throw lastError;
}

export function fetchChatHistory() {
  return get("/chatbot/history");
}

export function clearChatHistory() {
  return del("/chatbot/history");
}
