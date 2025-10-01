document.addEventListener("DOMContentLoaded", function () {
    const headers = document.querySelectorAll(".accordion-header");

    headers.forEach(header => 
    {
        header.addEventListener("click", function () 
        {
            const currentlyActive = document.querySelector(".accordion-header.active");
            const contentToShow = this.nextElementSibling;

            if (currentlyActive && currentlyActive !== this) 
            {
                currentlyActive.classList.remove("active");
                currentlyActive.nextElementSibling.style.display = "none";
            }

            const isVisible = contentToShow.style.display === "block";
            this.classList.toggle("active");
            contentToShow.style.display = isVisible ? "none" : "block";
        });
    });
});