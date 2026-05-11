async function loadHome() {
    const response = await fetch("./components/home.html");
    const data = await response.text();

    document.getElementById("home-container").innerHTML = data;
}

loadHome();