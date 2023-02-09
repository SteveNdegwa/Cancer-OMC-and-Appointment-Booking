// function topScroll(){
//     window.scroll({
//         top: 0,
//         left: 0,
//         behavior:'smooth'
//     });
// }

function topScroll(){
    let e = document.getElementById('nav-bar');
    e.scrollIntoView({
        block: 'start',
        behavior: "smooth",
        inline: 'start'
    });
}