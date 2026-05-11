async function loadNavbar() {
    const response = await fetch("./components/navbar.html");
    const data = await response.text();

    document.getElementById("navbar-container").innerHTML = data;
}

loadNavbar();