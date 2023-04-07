// function topScroll(){
//     window.scroll({
//         top: 0,
//         left: 0,
//         behavior:'smooth'
//     });
// }


    let top = document.getElementById("top");
    top.addEventListener("click",()=>{
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
    
    // e.scrollIntoView({
    //     block: 'start',
    //     behavior: "smooth",
    //     inline: 'start'
    // });