async function loadHero() {
    const response = await fetch("./components/hero.html");
    const data = await response.text();

    document.getElementById("hero-container").innerHTML = data;
}

loadHero();