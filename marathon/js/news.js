/**
 * MarathonDB News - Listing Page Interactivity
 * Handles category filtering on the /news/ listing page.
 */
(function() {
    'use strict';

    const filterButtons = document.querySelectorAll('.news-filter-btn');
    const articleCards = document.querySelectorAll('.news-card[data-category]');
    const featuredCard = document.querySelector('.news-featured-card[data-category]');
    const featuredSection = document.querySelector('.news-featured');
    const emptyState = document.querySelector('.news-empty');

    if (!filterButtons.length) return;

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;

            // Update active button
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            let visibleCount = 0;

            // Filter featured card
            if (featuredCard && featuredSection) {
                if (category === 'all' || featuredCard.dataset.category === category) {
                    featuredSection.style.display = '';
                    visibleCount++;
                } else {
                    featuredSection.style.display = 'none';
                }
            }

            // Filter article cards
            articleCards.forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            // Empty state
            if (emptyState) {
                emptyState.style.display = visibleCount === 0 ? '' : 'none';
            }
        });
    });
})();
