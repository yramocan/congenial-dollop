new Splide(
    '.dealer-spotlight-slider',
    {
        // drag: 'free',
        perPage: 3,
        // perMove: 1,
        // focus: 0,
        type: 'loop',
        gap: '1em',
        // arrows: 'slider',
        padding: { left: '4em', right: '4em' },
        // rewindSpeed: 400,
        // waitForTransition: false,
        // updateOnMove: true,
        // trimSpace: 'move',
        // omitEnd: true,
        breakpoints: {
            991: {
                perPage: 3,
            },
            767: {
                drag: true,
                perPage: 1,
            },
            479: {
                perPage: 1,
            }
        }
    }
).mount();