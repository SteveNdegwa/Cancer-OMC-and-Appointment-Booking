function gender1(){
    if(document.getElementById('male').checked){
        document.getElementById('female').checked=false;
    }
}

function gender2(){
    if(document.getElementById('female').checked){
        document.getElementById('male').checked=false;
    }
}
