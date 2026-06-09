import { get, post } from "./client.js";

export function getRecommendations() {
    return get("/recommendations");
}

export function explainRecommendation(eventId) {
    return post("/recommendations/explain", { eventId });
}
