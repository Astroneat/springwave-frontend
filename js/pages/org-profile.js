import "../../src/style.css";
import { loadNavbar } from "../components/navbar.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent } from "../lib/utils.js";
import { get } from "../api/client.js";

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

    try {
        const response = await get(`/organizations/${orgId}`);
        const org = response.organization;
        
        if (org) {
            document.getElementById("org-name").textContent = org.orgName || "Unknown Organization";
            document.getElementById("org-bio").textContent = org.bio || "No bio available.";
            
            // Optionally, fetch and populate events:
            // const eventsResponse = await get(`/organizations/${orgId}/events`);
            // Render events here...
        }
    } catch (error) {
        console.error("Failed to load organization:", error);
        document.getElementById("org-name").textContent = "Error Loading Organization";
        document.getElementById("org-bio").textContent = error.message;
    }
});
