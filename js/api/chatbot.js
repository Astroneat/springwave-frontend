import { get, post, postStream, del } from "./client.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gửi tin nhắn chatbot trực tiếp tới backend (REST JSON fallback).
 */
export async function sendChatMessage(message, history) {
  return await post("/chatbot/chat", { message, history }, { priority: true, timeout: 60000 });
}

/**
 * Gửi tin nhắn chatbot qua luồng Streaming (SSE) thời gian thực.
 */
export function sendChatMessageStream(message, history, callbacks = {}, options = {}) {
  return postStream("/chatbot/chat/stream", { message, history }, callbacks, options);
}

export function fetchChatHistory() {
  return get("/chatbot/history");
}

export function clearChatHistory() {
  return del("/chatbot/history");
}
