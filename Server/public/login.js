function status(){
    let s=document.getElementById('status');
    let text = s.innerHTML;
    if(text == "Wrong Username or password"){
        s.style.color = "red";
    }
    else{
        s.style.color = "blue"; 
    }
}