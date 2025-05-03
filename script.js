// Hamburger menu toggle for left menu
        const hamburgerLeft = document.querySelector('.hamburger-left');
        const navMenuLeft = document.querySelector('.nav-menu-left');

        hamburgerLeft.addEventListener('click', () => {
            hamburgerLeft.classList.toggle('active');
            navMenuLeft.classList.toggle('active');
            const isExpanded = hamburgerLeft.getAttribute('aria-expanded') === 'true';
            hamburgerLeft.setAttribute('aria-expanded', !isExpanded);
        });

        // Hamburger menu toggle for right menu
        const hamburgerRight = document.querySelector('.hamburger-right');
        const navMenuRight = document.querySelector('.nav-menu-right');

        hamburgerRight.addEventListener('click', () => {
            hamburgerRight.classList.toggle('active');
            navMenuRight.classList.toggle('active');
            const isExpanded = hamburgerRight.getAttribute('aria-expanded') === 'true';
            hamburgerRight.setAttribute('aria-expanded', !isExpanded);
        });

        // Close left menu when clicking a link
        document.querySelectorAll('.nav-menu-left a').forEach(link => {
            link.addEventListener('click', () => {
                hamburgerLeft.classList.remove('active');
                navMenuLeft.classList.remove('active');
                hamburgerLeft.setAttribute('aria-expanded', 'false');
            });
        });

        // Close right menu when clicking a link
        document.querySelectorAll('.nav-menu-right a').forEach(link => {
            link.addEventListener('click', () => {
                hamburgerRight.classList.remove('active');
                navMenuRight.classList.remove('active');
                hamburgerRight.setAttribute('aria-expanded', 'false');
            });
        });
