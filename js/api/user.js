import { get, put, post, del } from "./client.js";

export function getParticipatedActivities() {
    return get("/user/participated");
}

export function changeInfo(data) {
    return put("/user/changeInfo", data);
}

export function addFavourite(id) {
    return post(`/user/favourite/${id}`);
}

export function removeFavourite(id) {
    return del(`/user/favourite/${id}`);
}

export function checkFavourite(id) {
    return get(`/user/favourite/${id}`);
}

export function getFavourites() {
    return get("/user/favourites");
}
