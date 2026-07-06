import "../../src/style.css";
import { isAuthenticated, getUser } from "../lib/session.js";
import { initChatbot } from "../components/chatbot.js";
import { loadNavbar } from "../components/navbar.js";
import { get } from "../api/client.js";
import { formatDate } from "../lib/utils.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!isAuthenticated()) {
        window.location.href = "/login.html";
        return;
    }

    await loadNavbar();
    await initChatbot();

    try {
        const myOrgsResponse = await get("/organizations/my");
        const orgs = myOrgsResponse.organizations || [];

        if (orgs.length > 0) {
            const org = orgs[0]; // For now, default to the first organization
            const orgSlugElem = document.getElementById("org-slug");
            if (orgSlugElem) {
                orgSlugElem.textContent = org.orgName || "Org Manager";
            }

            // Fetch events for this organization
            try {
                const activitiesResponse = await get(`/organizations/${org._id}/activities`);
                const activities = activitiesResponse.activities || [];
                const eventList = document.getElementById("event-list");
                
                if (eventList) {
                    eventList.innerHTML = "";
                    if (activities.length === 0) {
                        eventList.innerHTML = `<tr><td colspan="4" class="px-8 py-6 text-center text-on-surface-variant">No events found.</td></tr>`;
                    } else {
                        activities.forEach(activity => {
                            const tr = document.createElement("tr");
                            tr.className = "hover:bg-primary/5 transition-all group";
                            tr.innerHTML = `
                                <td class="px-8 py-6">
                                    <div class="flex items-center gap-4">
                                        <div class="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center overflow-hidden">
                                            ${activity.banner ? `<img src="${activity.banner}" class="w-full h-full object-cover">` : '<span class="material-symbols-outlined">event</span>'}
                                        </div>
                                        <span class="font-body-lg text-body-md font-semibold text-on-surface">${activity.name || 'Untitled Event'}</span>
                                    </div>
                                </td>
                                <td class="px-8 py-6 text-on-surface-variant font-body-md">${formatDate(activity.date)}</td>
                                <td class="px-8 py-6">
                                    <span class="px-3 py-1 bg-green-100 text-green-700 text-label-md font-label-md rounded-full border border-green-200">${activity.status || 'Published'}</span>
                                </td>
                                <td class="px-8 py-6 text-right">
                                    <div class="flex justify-end gap-2">
                                        <button class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-all" title="Manage">
                                            <span class="material-symbols-outlined text-[20px]">analytics</span>
                                        </button>
                                    </div>
                                </td>
                            `;
                            eventList.appendChild(tr);
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to load org activities:", err);
            }
        } else {
            const orgSlugElem = document.getElementById("org-slug");
            if (orgSlugElem) orgSlugElem.textContent = "No Organizations";
            const eventList = document.getElementById("event-list");
            if (eventList) {
                eventList.innerHTML = `<tr><td colspan="4" class="px-8 py-6 text-center text-on-surface-variant">You don't manage any organizations yet.</td></tr>`;
            }
        }
    } catch (error) {
        console.error("Failed to load organizations:", error);
    }
});
