new Splide('.member-benefits-cards-group', {
    breakpoints: {
        991: {
            direction: 'ltr',
            gap: 0,
            height: '175px',
            perPage: 2,
        },
        767: {
            perPage: 1,
        },
    },
    direction: 'ttb',
    heightRatio: 1, // 100% height of its container
    gap: '1em',
    pagination: false,
    perPage: 3,
    wheel: true,
}).mount();

new Splide('.member-only-experiences-carousel', {
    breakpoints: {
        991: {
            perPage: 2,
        },
        767: {
            perPage: 1,
        },
    },
    gap: '1em',
    pagination: false,
    perPage: 3,
    wheel: true,
}).mount();
