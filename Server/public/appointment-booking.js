
document.getElementById('date').value = "";
document.getElementById('time').value = "";

var table = document.getElementById('mytable'), rIndex, cIndex;

for (var i = 0; i < table.rows.length; i++) {

    for (var j = 0; j < table.rows[i].cells.length; j++) {

        table.rows[i].cells[j].onclick = function () {

            rIndex = this.parentElement.rowIndex;
            cIndex = this.cellIndex + 1;


            console.log(`Row: ${rIndex} , Cell: ${cIndex}`);
            console.log(table.rows[rIndex].cells[0].innerHTML);

            let time = '';

            if (cIndex == 2) {
                time = "8.00AM"
            }
            if (cIndex == 3) {
                time = "8.30AM"
            }
            if (cIndex == 4) {
                time = "9.00AM"
            }
            if (cIndex == 5) {
                time = "9.30AM"
            }
            if (cIndex == 6) {
                time = "10.00AM"
            }
            if (cIndex == 7) {
                time = "10.30AM"
            }
            if (cIndex == 8) {
                time = "11.00AM"
            }
            if (cIndex == 9) {
                time = "11.30AM"
            }
            if (cIndex == 10) {
                time = "12.00PM"
            }
            if (cIndex == 11) {
                time = "12.30PM"
            }
            if (cIndex == 12) {
                time = "2.00PM"
            }
            if (cIndex == 13) {
                time = "2.30PM"
            }
            if (cIndex == 14) {
                time = "3.00PM"
            }
            if (cIndex == 15) {
                time = "3.30PM"
            }




            if (cIndex == 1 || cindex == 2 || rIndex == 0) {
                alert("Please Click On the Time Slots to select Your preferred Time and date")
                rIndex = null;
                cIndex = null;
                console.log(`Row: ${rIndex} , Cell: ${cIndex}`);
            }
            else {

                for (var k = 0; k < table.rows.length; k++) {
                    for (var l = 0; l < table.rows[k].cells.length; l++) {
                        table.rows[k].cells[l].style.backgroundColor = 'white';
                    }
                }


                table.rows[rIndex].cells[cIndex - 1].style.backgroundColor = 'darkslategray';

                document.getElementById('selected-details').innerHTML = table.rows[rIndex].cells[0].innerHTML + " ,   " + time;
                document.getElementById('booking-status').innerHTML = table.rows[rIndex].cells[cIndex - 1].innerHTML;




                document.getElementById('date').value = (table.rows[rIndex].cells[0].innerHTML).trim();
                document.getElementById('time').value = time;

            }

        }


    }
}



var table2 = document.getElementById('mytable2'), rIndex2, cIndex2;
for (var i = 0; i < table2.rows.length; i++) {

    for (var j = 0; j < table2.rows[i].cells.length; j++) {

        table2.rows[i].cells[j].onclick = function () {

            rIndex2 = this.parentElement.rowIndex;
            cIndex2 = this.cellIndex + 1;


            console.log(`Row: ${rIndex2} , Cell: ${cIndex2}`);
            console.log(table2.rows[rIndex2].cells[0].innerHTML);

            let time2 = '';

            if (cIndex2 == 2) {
                time2 = "8.00AM"
            }
            if (cIndex2 == 3) {
                time2 = "8.30AM"
            }
            if (cIndex2 == 4) {
                time2 = "9.00AM"
            }
            if (cIndex2 == 5) {
                time2 = "9.30AM"
            }
            if (cIndex2 == 6) {
                time2 = "10.00AM"
            }
            if (cIndex2 == 7) {
                time2 = "10.30AM"
            }
            if (cIndex2 == 8) {
                time2 = "11.00AM"
            }
            if (cIndex2 == 9) {
                time2 = "11.30AM"
            }
            if (cIndex2 == 10) {
                time2 = "12.00PM"
            }
            if (cIndex2 == 11) {
                time2 = "12.30PM"
            }
            if (cIndex2 == 12) {
                time2 = "2.00PM"
            }
            if (cIndex2 == 13) {
                time2 = "2.30PM"
            }
            if (cIndex2 == 14) {
                time2 = "3.00PM"
            }
            if (cIndex2 == 15) {
                time2 = "3.30PM"
            }




            if (cIndex2 == 1 || cindex2 == 2 || rIndex2 == 0) {
                alert("Please Click On the Time Slots to select Your preferred Time and date and not on the date")
                rIndex2 = null;
                cIndex2 = null;
                console.log(`Row: ${rIndex2} , Cell: ${cIndex2}`);
            }
            else {

                for (var k = 0; k < table2.rows.length; k++) {
                    for (var l = 0; l < table2.rows[k].cells.length; l++) {
                        table2.rows[k].cells[l].style.backgroundColor = 'white';
                    }
                }

                table2.rows[rIndex2].cells[cIndex2 - 1].style.backgroundColor = 'darkslategray';

                document.getElementById('selected-details').innerHTML = table2.rows[rIndex2].cells[0].innerHTML + " ,   " + time2;
                document.getElementById('booking-status').innerHTML = `${table2.rows[rIndex2].cells[cIndex2 - 1].innerHTML}`;

                document.getElementById('date').value = (table2.rows[rIndex2].cells[0].innerHTML).trim();
                document.getElementById('time').value = time2;
            }
        }


    }
}


var table3 = document.getElementById('mytable3'), rIndex3, cIndex3;
for (var i = 0; i < table3.rows.length; i++) {

    for (var j = 0; j < table3.rows[i].cells.length; j++) {

        table3.rows[i].cells[j].onclick = function () {

            rIndex3 = this.parentElement.rowIndex;
            cIndex3 = this.cellIndex + 1;


            console.log(`Row: ${rIndex3} , Cell: ${cIndex3}`);
            console.log(table.rows[rIndex3].cells[0].innerHTML);

            let time3 = '';

            if (cIndex3 == 2) {
                time3 = "8.00AM"
            }
            if (cIndex3 == 3) {
                time3 = "8.30AM"
            }
            if (cIndex3 == 4) {
                time3 = "9.00AM"
            }
            if (cIndex3 == 5) {
                time3 = "9.30AM"
            }
            if (cIndex3 == 6) {
                time3 = "10.00AM"
            }
            if (cIndex3 == 7) {
                time3 = "10.30AM"
            }
            if (cIndex3 == 8) {
                time3 = "11.00AM"
            }
            if (cIndex3 == 9) {
                time3 = "11.30AM"
            }
            if (cIndex3 == 10) {
                time3 = "12.00PM"
            }
            if (cIndex3 == 11) {
                time3 = "12.30PM"
            }
            if (cIndex3 == 12) {
                time3 = "2.00PM"
            }
            if (cIndex3 == 13) {
                time3 = "2.30PM"
            }
            if (cIndex3 == 14) {
                time3 = "3.00PM"
            }
            if (cIndex3 == 15) {
                time3 = "3.30PM"
            }




            if (cIndex3 == 1 || cindex3 == 2 || rIndex3 == 0) {
                alert("Please Click On the Time Slots to select Your preferred Time and date and not on the date")
                rIndex3 = null;
                cIndex3 = null;
                console.log(`Row: ${rIndex3} , Cell: ${cIndex3}`);
            }
            else {

                for (var k = 0; k < table3.rows.length; k++) {
                    for (var l = 0; l < table3.rows[k].cells.length; l++) {
                        table3.rows[k].cells[l].style.backgroundColor = 'white';
                    }
                }

                table3.rows[rIndex3].cells[cIndex3 - 1].style.backgroundColor = 'darkslategray';

                document.getElementById('selected-details').innerHTML = table3.rows[rIndex3].cells[0].innerHTML + " ,   " + time3;
                document.getElementById('booking-status').innerHTML = `${table3.rows[rIndex3].cells[cIndex3 - 1].innerHTML}`;

                document.getElementById('date').value = (table3.rows[rIndex3].cells[0].innerHTML).trim();
                document.getElementById('time').value = time3;
            }
        }


    }
}

document.getElementById('reset').addEventListener('click', () => {
    document.getElementById('date').value = "";
    document.getElementById('time').value = "";

    document.getElementById('selected-details').innerHTML = "null";
    document.getElementById('booking-status').innerHTML = "";

    for (var k = 0; k < table.rows.length; k++) {
        for (var l = 0; l < table.rows[k].cells.length; l++) {
            table.rows[k].cells[l].style.backgroundColor = 'white';
            table2.rows[k].cells[l].style.backgroundColor = 'white';
            table3.rows[k].cells[l].style.backgroundColor = 'white';
        }
    }

})