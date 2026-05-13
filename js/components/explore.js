async function loadExplore() {
    const response = await fetch("./components/explore.html");
    const data = await response.text();
    document.getElementById("explore-container").innerHTML = data;

    const floatingSearch = document.getElementById("floating-search");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 800) {
            floatingSearch.classList.add("visible");
        }
        else {
            floatingSearch.classList.remove("visible");
        }
    });
}

loadExplore();