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
}

loadNavbar();