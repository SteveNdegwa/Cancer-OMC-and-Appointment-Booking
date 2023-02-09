function type1(){
    if(document.getElementById('patient').checked){
        document.getElementById('doctor').checked=false;
    }
}

function type2(){
    if(document.getElementById('doctor').checked){
        document.getElementById('patient').checked=false;
    }
}




