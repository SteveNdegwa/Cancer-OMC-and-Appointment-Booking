let count = 1;

document.getElementById("slots").value = count;


const btn = document.getElementById('btn');

btn.addEventListener('click', () => {

    let time = "08:00";
    let prevTime = "07:00";

    var previousId = "time1";

    if (count > 1) {

        let count2 = count - 1;
        previousId = "time" + count2;
        time = document.getElementById(previousId).value;
        console.log(time);

        let duration = document.getElementById('length').value;
        console.log(duration);

        let date = new Date(`December 17, 1995 ${time}`);
        let date2 = date.getTime() + duration * 60000;
        let date3 = date.getTime() + 10 * 60000;
        date = new Date(date2);
        let date4 = new Date(date3);


        let time2 = date.toLocaleTimeString();
        let prevTime2 = date4.toLocaleTimeString();


        let time3 = "0" + time2.slice(0, 4);
        let prevTime3 = "0" + prevTime2.slice(0, 4);

        let t = time3.slice(3, 4);
        let y = prevTime3.slice(3, 4);

        if (t == ":") {
            time = time2.slice(0, 5);
        } else {
            time = "0" + time2.slice(0, 4);
        }

        if (y == ":") {
            prevTime = prevTime2.slice(0, 5);
        } else {
            prevTime = "0" + prevTime2.slice(0, 4);
        }

        console.log(time);
        console.log(prevTime);

    }

    if ( count > 1) {
        const input2 = document.getElementById(previousId);
        const isValid = input2.checkValidity();
        console.log(isValid);
        if (isValid == true) {
            let id = "time" + count;

            console.log(id);

            const input = document.createElement('input');
            input.type = "time";
            input.className = "time-select";
            input.id = id;
            input.name = id;
            input.value = time;
            input.min = prevTime;
            input.max = "17:00";
            input.required = true;

            const timeh1 = document.createElement('h4');
            timeh1.className = "time-h4";
            timeh1.id = id + "-h4";
            timeh1.innerHTML = "Appointment Slot " + count;


            const div = document.createElement('div');
            div.className = "time-div";
            div.id = "div-" + id;
            div.appendChild(timeh1);
            div.appendChild(input);


            const container = document.getElementById('container')
            container.appendChild(div);

            count++;
            document.getElementById("slots").value = count;
        } else {
            input2.value = "";
        }

    }

    if(count == 1){
        let id = "time" + count;

            console.log(id);

            const input = document.createElement('input');
            input.type = "time";
            input.className = "time-select";
            input.id = id;
            input.name = id;
            input.value = time;
            input.min = prevTime;
            input.max = "17:00";
            input.required = true;

            const timeh1 = document.createElement('h4');
            timeh1.className = "time-h4";
            timeh1.id = id + "-h4";
            timeh1.innerHTML = "Appointment Slot " + count;


            const div = document.createElement('div');
            div.className = "time-div";
            div.id = "div-" + id;
            div.appendChild(timeh1);
            div.appendChild(input);


            const container = document.getElementById('container')
            container.appendChild(div);

            count++;
            document.getElementById("slots").value = count;
    }



});


const btn2 = document.getElementById('btn-2');
btn2.addEventListener('click', () => {

    if (count > 1) {
        var elements = document.getElementsByClassName("time-div");
        var length = (elements.length) -1;
        var element = elements[length];
        var id = element.id;
        console.log(id);

        const div = document.getElementById(id);
        div.remove();

        count--;
        document.getElementById("slots").value = count;

    }
})

// reset.addEventListener('click', () => {
//     sunday.checked = false;
//     monday.checked = false;
//     tuesday.checked = false;
//     wednesday.checked = false;
//     thursday.checked = false;
//     friday.checked = false;
//     saturday.checked = false;
// })


