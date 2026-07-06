const STORAGE = window.localStorage;

export function setToken(token) {
    STORAGE.setItem("token", token);
}

export function getToken() {
    return STORAGE.getItem("token");
}

export function removeToken() {
    STORAGE.removeItem("token");
}

export function setSigningKey(key) {
    STORAGE.setItem("signingKey", key);
}

export function getSigningKey() {
    return STORAGE.getItem("signingKey");
}

export function removeSigningKey() {
    STORAGE.removeItem("signingKey");
}

export function setUser(user) {
    STORAGE.setItem("user", JSON.stringify(user));
}

export function getUser() {
    const user = STORAGE.getItem("user");
    return user ? JSON.parse(user) : null;
}

export function removeUser() {
    STORAGE.removeItem("user");
}

export function createSession(token, user) {
    setToken(token);
    setUser(user);
}

export function clearSession() {
    removeToken();
    removeSigningKey();
    removeUser();
}

export function isAuthenticated() {
    return !!getToken();
}

export function logout() {
    clearSession();
    if (window.google?.accounts?.id) {
        google.accounts.id.disableAutoSelect();
    }
}
