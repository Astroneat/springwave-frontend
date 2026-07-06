import "../../src/style.css";
import { isAuthenticated, getUser } from "../lib/session.js";
import { loadNavbar } from "../components/navbar.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent } from "../lib/utils.js";
import { uploadFormData } from "../api/client.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!isAuthenticated()) {
        window.location.href = "/login.html"; 
        return;
    }

    const user = getUser();

    await loadNavbar({ activeSection: 'host' });
    await fetchContent("./components/footer.html").then(html => {
        const footerContainer = document.getElementById("footer-container");
        if (footerContainer) footerContainer.innerHTML = html;
    });
    await initChatbot();

    const form = document.querySelector('form');
    if (form) {
        // Pre-fill user data
        const phoneInput = document.getElementById("phoneNo");
        const nameInput = document.getElementById("representativeName");
        
        if (phoneInput && user.phoneNo) {
            phoneInput.value = user.phoneNo;
            phoneInput.readOnly = true;
            phoneInput.classList.add("opacity-70", "cursor-not-allowed");
        }
        if (nameInput && user.fullname) {
            nameInput.value = user.fullname;
            nameInput.readOnly = true;
            nameInput.classList.add("opacity-70", "cursor-not-allowed");
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> <span>Processing...</span>';
            btn.classList.add('opacity-80', 'pointer-events-none');

            const formData = new FormData(form);
            
            try {
                await uploadFormData("/host/register", formData);
                
                btn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> <span>Submission Received!</span>';
                btn.classList.remove('bg-gradient-to-r', 'from-primary-container', 'to-secondary');
                btn.classList.add('bg-green-600');
                
                setTimeout(() => {
                    alert("Registration successful! Our team will review your application.");
                    window.location.href = "/";
                }, 1500);
            } catch (error) {
                alert("Error: " + error.message);
                btn.innerHTML = originalText;
                btn.classList.remove('opacity-80', 'pointer-events-none');
            }
        });
    }
});
