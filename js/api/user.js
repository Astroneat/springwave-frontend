import { get, put, post, del } from "./client.js";

export function getParticipatedActivities() {
    return get("/user/participated");
}

export function changeInfo(data) {
    return put("/user/changeInfo", data);
}

function normalizeFavEvents(response) {
    if (response.events) {
        return { activities: response.events.map(e => ({ ...e, activityID: e._id })) };
    }
    return response;
}

export function addFavourite(id) {
    return post(`/user/favorites/${id}`);
}

export function removeFavourite(id) {
    return del(`/user/favorites/${id}`);
}

export function checkFavourite(id) {
    return get(`/user/favorites/${id}`);
}

export function getFavourites() {
    return get("/user/favorites").then(normalizeFavEvents);
}
