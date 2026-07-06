import "../../src/style.css";
import { loadNavbar } from "../components/navbar.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent } from "../lib/utils.js";
import { get } from "../api/client.js";
import { getUser } from "../lib/session.js";

document.addEventListener("DOMContentLoaded", async () => {
    await loadNavbar({ activeSection: 'explore' });
    await fetchContent("./components/footer.html").then(html => {
        const footerContainer = document.getElementById("footer-container");
        if (footerContainer) footerContainer.innerHTML = html;
    });
    await initChatbot();

    const params = new URLSearchParams(window.location.search);
    const orgId = params.get('id');

    if (!orgId) {
        document.getElementById("org-name").textContent = "Organization Not Found";
        document.getElementById("org-bio").textContent = "No ID provided.";
        return;
    }

    let org = null;
    try {
        const response = await get(`/organizations/${orgId}`);
        org = response.organization;
    } catch (error) {
        console.error("Failed to load organization from API:", error);
    }

    if (!org) {
        document.getElementById("org-name").textContent = "Organization Not Found";
        document.getElementById("org-bio").textContent = "Failed to load organization details.";
        return;
    }
    document.getElementById("org-name").textContent = org.name || org.orgName || "Unknown Organization";
    document.getElementById("org-bio").textContent = org.description || org.bio || "No bio available.";
    
    const avatarImg = document.getElementById("org-avatar");
    const coverImg = document.getElementById("org-cover");
    const loggedInUser = getUser() || {};
    
    // Lấy avatar và background (cover) từ organization. 
    // Nếu API chưa hỗ trợ thì fallback sang thông tin của owner hoặc của user host đang đăng nhập
    let orgAvatar = org.avatar || org.owner?.avatar || org.host?.avatar;
    let orgCover = org.coverImage || org.background || org.owner?.background || org.owner?.coverImage || org.host?.background;
    
    if (!orgAvatar && loggedInUser.avatar) orgAvatar = loggedInUser.avatar;
    if (!orgCover && (loggedInUser.background || loggedInUser.coverImage)) {
        orgCover = loggedInUser.background || loggedInUser.coverImage;
    }
    
    if (avatarImg) {
        avatarImg.src = orgAvatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(org.name || org.orgName || "Org");
    }
    
    if (coverImg && orgCover) {
        coverImg.style.backgroundImage = `url('${orgCover}')`;
    }
    
    // Render email và website if available
    const emailEl = document.getElementById("org-email");
    const webEl = document.getElementById("org-website");
    if (emailEl) emailEl.textContent = org.contactInfo?.email || org.email || org.contactEmail || "-";
    if (webEl) webEl.textContent = org.website || org.websiteUrl || "-";
    
    // Optionally, fetch and populate events:
    // const eventsResponse = await get(`/organizations/${orgId}/events`);
    // Render events here...
});
