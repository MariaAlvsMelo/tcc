const cabecalho = document.querySelector(".cabecalho");

let lastScrollY = window.scrollY;

if (cabecalho) {

    window.addEventListener("scroll", () => {

        if (window.scrollY > lastScrollY) {

            // Usuário está descendo
            cabecalho.classList.add("cabecalho--hidden");

        } else {

            // Usuário está subindo
            cabecalho.classList.remove("cabecalho--hidden");

        }

        lastScrollY = window.scrollY;

    });

}