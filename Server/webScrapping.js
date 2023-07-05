const puppeteer = require("puppeteer");

(async ()=>{
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.goto("https://kmpdc.go.ke/Registers/MTreg/master_reg.php", {waitUntil: 'load', timeout: 0});

    // await page.screenshot({path: "mywebsite.png"})


//     await page.type('#mytextarea', 'World', {delay: 100});


    await page.type("#productdataTable_filter input", 'stephen');

    await page.select("#productdataTable_length select", "100");

    const grabDetails = await page.evaluate(()=>{
        const tableRow = document.querySelectorAll(".table.table-bordered.dataTable tr")

        let array = [];
        tableRow.forEach((row)=>{
            let doctor = {};
            let tds = row.querySelectorAll("td");

            let count = 0;
            tds.forEach((td)=>{
                if(count == 1){
                    doctor.licenceNumber = td.innerText;
                }
                if(count == 2){
                    doctor.name = td.innerText;
                }
                if(count == 3){
                    doctor.qualifications = td.innerText;
                }
                if(count == 4){
                    doctor.speciality = td.innerText;
                }
                if(count == 8){
                    doctor.status = td.innerText;
                }
                count ++;
            })

            array.push(doctor);
        })
       
        return array;
        
    })

    console.log(grabDetails);

    await browser.close();
})();