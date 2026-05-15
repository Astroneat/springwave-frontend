import { post, get } from "./client.js";

export function getActivities() {
    return get("/activities");
}