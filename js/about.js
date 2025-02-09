new Splide('.about-history-facts-container', {
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

new Splide('.board-directors-container', {
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
}).mount();

new Splide('.partnerships-container', {
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