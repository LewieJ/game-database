(() => {
  'use strict';

  const menuToggle = document.getElementById('menuToggle');
  const navDropdown = document.getElementById('navDropdown');
  const fadeEls = document.querySelectorAll('.fade-in');

  if (menuToggle && navDropdown) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navDropdown.classList.toggle('open');
    });

    navDropdown.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navDropdown.classList.remove('open');
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.navbar')) {
        menuToggle.classList.remove('active');
        navDropdown.classList.remove('open');
      }
    });
  }

  // Scroll-triggered fade-in via IntersectionObserver
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    fadeEls.forEach(el => observer.observe(el));
  } else {
    fadeEls.forEach(el => el.classList.add('visible'));
  }

  // Stagger animation for grid children
  document.querySelectorAll('.games-grid, .features-grid').forEach(grid => {
    const cards = grid.querySelectorAll('.fade-in');
    cards.forEach((card, i) => {
      card.style.transitionDelay = `${i * 100}ms`;
    });
  });
})();
