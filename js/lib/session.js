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
    const user = getUser();
    if (user && user._id) {
        STORAGE.removeItem(`springwave_notifications_${user._id}`);
    }
    STORAGE.removeItem("springwave_notifications");
    STORAGE.removeItem("springwave_notifications_guest");
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

export function isProfileComplete(user) {
    if (!user) return false;
    return !!(user.dob && user.school && user.class && user.major && user.phoneNo);
}

export function isStudentVerified(user) {
    if (!user) return false;
    return !!(user.isStudentVerified || user.role === "admin" || user.role === "host");
}
