export function setToken(token) {
    sessionStorage.setItem("token", token);
}

export function getToken() {
    return sessionStorage.getItem("token");
}

export function removeToken() {
    sessionStorage.removeItem("token");
}

export function setSigningKey(key) {
    sessionStorage.setItem("signingKey", key);
}

export function getSigningKey() {
    return sessionStorage.getItem("signingKey");
}

export function removeSigningKey() {
    sessionStorage.removeItem("signingKey");
}

export function setUser(user) {
    sessionStorage.setItem("user", JSON.stringify(user));
}

export function getUser() {
    const user = sessionStorage.getItem("user");
    return user ? JSON.parse(user) : null;
}

export function removeUser() {
    sessionStorage.removeItem("user");
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
