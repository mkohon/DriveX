document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. VALUTE I LOKALNO SPREMANJE
    // ==========================================
    const odabiriValute = document.querySelectorAll('.select-valuta');
    const elementiCijenaKartice = document.querySelectorAll('.price[data-osnovna-cijena]');
    const odabirVozilaForma = document.getElementById('odabirVozila');
    const prikazCijeneForma = document.getElementById('prikazCijeneForma');
    const iznosCijeneForma = document.getElementById('iznosCijeneForma');

    // Dohvaćanje spremljene valute iz LocalStorage-a (zadano je 'EUR')
    let aktivnaValuta = localStorage.getItem('driveXValuta') || 'EUR';

    let tečajevi = { EUR: 1, USD: 1.08, GBP: 0.85 };
    const simboliValuta = { EUR: '€', USD: '$', GBP: '£' };

    // Postavljanje početne vrijednosti na sve padajuče izbornike za valutu na stranici
    odabiriValute.forEach(select => {
        select.value = aktivnaValuta;
    });

    // Dohvaćanje real-time tečajeva s ExchangeRate API-ja
    async function dohvatiTecajeve() {
        try {
            const odgovor = await fetch('https://open.er-api.com/v6/latest/EUR');
            const podaci = await odgovor.json();
            if (podaci && podaci.rates) {
                tečajevi.USD = podaci.rates.USD;
                tečajevi.GBP = podaci.rates.GBP;
            }
        } catch (greska) {
            console.warn('Koriste se zamjenski tečajevi:', greska);
        }
    }

    // Preračunavanje i ažuriranje prikaza svih cijena na web stranici
    function osvjeziSveCijene() {
        const tečaj = tečajevi[aktivnaValuta] || 1;
        const simbol = simboliValuta[aktivnaValuta] || aktivnaValuta;

        // Ažuriranje cijena na karticama (index.html)
        elementiCijenaKartice.forEach(el => {
            const osnovnaCijenaEur = parseFloat(el.getAttribute('data-osnovna-cijena'));
            const preračunata = (osnovnaCijenaEur * tečaj).toFixed(2);
            el.textContent = `${preračunata} ${simbol} / dan`;
        });

        // Ažuriranje cijene u formi za najam (najam.html)
        if (odabirVozilaForma && odabirVozilaForma.value !== '') {
            const odabranaOpcija = odabirVozilaForma.options[odabirVozilaForma.selectedIndex];
            const osnovnaCijena = parseFloat(odabranaOpcija.getAttribute('data-cijena'));
            
            if (osnovnaCijena) {
                const preračunataForma = (osnovnaCijena * tečaj).toFixed(2);
                iznosCijeneForma.textContent = `${preračunataForma} ${simbol}`;
                prikazCijeneForma.style.display = 'block';
            }
        } else if (prikazCijeneForma) {
            prikazCijeneForma.style.display = 'none';
        }
    }

    // Promjena valute sprema se globalno u LocalStorage i ažurira sve izbornike
    odabiriValute.forEach(select => {
        select.addEventListener('change', (e) => {
            aktivnaValuta = e.target.value;
            localStorage.setItem('driveXValuta', aktivnaValuta);
            
            odabiriValute.forEach(s => s.value = aktivnaValuta);
            osvjeziSveCijene();
        });
    });

    // Inicijalni poziv API-ja i osvježavanje prikaza
    dohvatiTecajeve().then(() => {
        osvjeziSveCijene();
    });

    // Event listener za promjenu vozila u formi najma
    if (odabirVozilaForma) {
        odabirVozilaForma.addEventListener('change', osvjeziSveCijene);
    }

    // ==========================================
    // 2. FORMA NAJMA
    // ==========================================
    const formaNajma = document.getElementById('formaNajma');
    const imeIPrezimeUnos = document.getElementById('imeIPrezime');
    const emailUnos = document.getElementById('email');
    const datumPreuzimanjaUnos = document.getElementById('datumPreuzimanja');
    const trakaUspjeha = document.getElementById('trakaUspjeha');

    if (!formaNajma) return;

    // Automatski odabir vozila preko URL parametra (npr. ?vozilo=Sportski%20Coupe)
    const parametriUrl = new URLSearchParams(window.location.search);
    const parametarVozila = parametriUrl.get('vozilo');
    if (parametarVozila && odabirVozilaForma) {
        odabirVozilaForma.value = parametarVozila;
        osvjeziSveCijene();
    }

    // Onemogućivanje odabira prošlih datuma
    const danas = new Date().toISOString().split('T')[0];
    if (datumPreuzimanjaUnos) datumPreuzimanjaUnos.setAttribute('min', danas);

    // Slanje forme
    formaNajma.addEventListener('submit', (e) => {
        e.preventDefault();

        if (provjeriFormu()) {
            const odabranaOpcija = odabirVozilaForma.options[odabirVozilaForma.selectedIndex];
            const osnovnaCijena = parseFloat(odabranaOpcija.getAttribute('data-cijena'));
            const tečaj = tečajevi[aktivnaValuta] || 1;
            const simbol = simboliValuta[aktivnaValuta] || aktivnaValuta;
            const izračunataCijena = `${(osnovnaCijena * tečaj).toFixed(2)} ${simbol}`;

            const podaciNajma = {
                id: Date.now(),
                ime: imeIPrezimeUnos.value.trim(),
                email: emailUnos.value.trim(),
                vozilo: odabirVozilaForma.value,
                cijena: izračunataCijena,
                datum: datumPreuzimanjaUnos.value
            };

            SpremiNajamULokalnuPohranu(podaciNajma);
            formaNajma.reset();
            if (prikazCijeneForma) prikazCijeneForma.style.display = 'none';
            
            trakaUspjeha.style.display = 'block';
            setTimeout(() => { trakaUspjeha.style.display = 'none'; }, 4000);
            
            prikaziNajmove();
        }
    });

	// Provjera ispravnosti forme
    function provjeriFormu() {
        let ispravno = true;

        if (imeIPrezimeUnos.value.trim().length < 3) {
            prikaziGresku('greskaIme'); 
            ispravno = false;
        } else { 
            sakrijGresku('greskaIme'); 
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailUnos.value.trim())) {
            prikaziGresku('greskaEmail'); 
            ispravno = false;
        } else { 
            sakrijGresku('greskaEmail'); 
        }

        if (odabirVozilaForma.value === '') {
            prikaziGresku('greskaVozilo'); 
            ispravno = false;
        } else { 
            sakrijGresku('greskaVozilo'); 
        }

        if (!datumPreuzimanjaUnos.value) {
            prikaziGresku('greskaDatum'); 
            ispravno = false;
        } else { 
            sakrijGresku('greskaDatum'); 
        }

        return ispravno;
    }

    function prikaziGresku(id) { document.getElementById(id).style.display = 'block'; }
    function sakrijGresku(id) { document.getElementById(id).style.display = 'none'; }

    function SpremiNajamULokalnuPohranu(podaci) {
        let najmovi = JSON.parse(localStorage.getItem('driveXNajmovi')) || [];
        najmovi.push(podaci);
        localStorage.setItem('driveXNajmovi', JSON.stringify(najmovi));
    }

    function dohvatiNajmoveIzLokalnePohrane() {
        return JSON.parse(localStorage.getItem('driveXNajmovi')) || [];
    }

    window.otkaziNajam = function(id) {
        let najmovi = dohvatiNajmoveIzLokalnePohrane().filter(n => n.id !== id);
        localStorage.setItem('driveXNajmovi', JSON.stringify(najmovi));
        prikaziNajmove();
    };

    function prikaziNajmove() {
        const najmovi = dohvatiNajmoveIzLokalnePohrane();
        const tijeloTablice = document.getElementById('tijeloTabliceNajmova');
        const tablica = document.getElementById('tablicaNajmova');
        const porukaNemaNajmova = document.getElementById('porukaNemaNajmova');

        if (!tijeloTablice || !tablica || !porukaNemaNajmova) return;

        tijeloTablice.innerHTML = '';
        
        if (najmovi.length === 0) {
            tablica.style.display = 'none';
            porukaNemaNajmova.style.display = 'block';
            return;
        }

        tablica.style.display = 'table';
        porukaNemaNajmova.style.display = 'none';

        najmovi.forEach(n => {
            const redak = document.createElement('tr');
            redak.innerHTML = `
                <td>${zastitiHtml(n.ime)}</td>
                <td>${zastitiHtml(n.email)}</td>
                <td>${zastitiHtml(n.vozilo)}</td>
                <td><strong>${zastitiHtml(n.cijena || '-')}</strong></td>
                <td>${zastitiHtml(n.datum)}</td>
                <td><button class="delete-btn" onclick="otkaziNajam(${n.id})">Otkaži</button></td>
            `;
            tijeloTablice.appendChild(redak);
        });
    }

	// Sigurnosna funkcija koja mijenja određene znakove da se ne može učitati kod iz forme prilikom unosa
    function zastitiHtml(tekst) {
        return String(tekst).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    prikaziNajmove();
});