async function loadExplore() {
    const response = await fetch("./components/explore.html");
    const data = await response.text();

    document.getElementById("explore-container").innerHTML = data;
}

loadExplore();