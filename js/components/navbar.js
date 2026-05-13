import { isAuthenticated, getUser } from "../lib/session.js";

async function loadNavbar() {
    const response = await fetch("./components/navbar.html");
    const data = await response.text();

    document.getElementById("navbar-container").innerHTML = data;

    const navbar = document.getElementById("navbar");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 60) {
            navbar.classList.add("collapsed");
        } else {
            navbar.classList.remove("collapsed");
        }
    });

    localStorage.clear();
    // localStorage.setItem("token", "123");
    // localStorage.setItem(
    //     "user", 
    //     JSON.stringify({
    //         userID: "uuid",
    //         fullname: "John Doe",
    //         username: "johndoe",
    //         email: "john@example.com",
    //         role: "user"
    //     })
    // );

    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    const authSection = document.getElementById("auth-section");
    if(isAuthenticated()) {
        const user = getUser();

        // authSection.innerHTML = `
        //     <a href="/profile.html"class="user-chip">
        //         <div class="user-avatar">
        //             ${user.username
        //                 .charAt(0)
        //                 .toUpperCase()}
        //         </div>

        //         <span class="user-name">
        //             ${user.username}
        //         </span>
        //     </a>
        // `;
        authSection.innerHTML = `
            <a href="/profile.html"class="user-chip">
                <span class="user-name">
                    ${user.username}
                </span>
            </a>
        `;
    }
    else {
        authSection.innerHTML = `
            <a href="/login.html" class="login-btn">Login</a>
        `;
    }
}

loadNavbar();