const grabBtn = document.getElementById("grabBtn");
const loader = document.getElementById("loader");
const status_mess = document.getElementById("status_mess");

grabBtn.addEventListener("click", () => {
    loader.style.display = "block";
    grabBtn.style.display = "none";
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tab = tabs[0];
        if (tab) {
            executeScript(tab);
        } else {
            alert("Нет активных вкладок");
        }
    });
});

function executeScript(tab) {
    chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: grabDataWithPhones
    }).then(results => {
        const data = results.flatMap(({ result }) => result);
        if (data.length === 0) {
            loader.style.display = "none";
            status_mess.style.display = "block";
            status_mess.innerText = "Нет данных для обработки!";
        } else {
            const csvContent = createCSV(data);
            saveToFile(csvContent, "resumes.csv");
            loader.style.display = "none";
            status_mess.style.display = "block";
            status_mess.innerText = `Успешно загружено! Строк: ${data.length}`;
            status_mess.style.color = "green";
        }
    });
}

function grabDataWithPhones() {
    // Клик по кнопкам "Показать телефон"
    const phoneButtons = document.querySelectorAll('[data-qa="response-resume_show-phone-number"]');
    phoneButtons.forEach(button => button.click());

    // Даем время для загрузки номеров телефонов
    return new Promise(resolve => {
        setTimeout(() => {
            const items = document.querySelectorAll('[data-qa="resume-serp__resume"]');
            const results = [];

            items.forEach(item => {
                const name = item.querySelector('[data-qa="resume-serp__resume-fullname"]')?.textContent.trim() || "------";
                const phone = Array.from(item.querySelectorAll('[data-qa="resume-phone"]'))
                    .map(phoneEl => phoneEl.textContent.trim())
                    .join(", ") || "------";
                const photo = item.querySelector('[data-qa="resume-card-avatar"] img')?.src || "------"; // Исправлено
                const age = item.querySelector('[data-qa="resume-serp__resume-age"]')?.textContent.trim() || "------";
                const experience = item.querySelector('[data-qa="resume-serp_resume-item-total-experience-content"]')?.textContent.trim() || "------";
                const lastJob = item.querySelector('[data-qa="resume-serp_resume-item-experience-content"]')?.textContent.trim() || "------";
                const city = item.querySelector('[data-qa="resume-serp_resume-item-area-and-relocation-content"]')?.textContent.trim() || "------";
                const link = item.querySelector('[data-qa="serp-item__title"] a')?.href || "------";

                results.push({ name, phone, photo, age, experience, lastJob, city, link });
            });

            resolve(results);
        }, 3000); // Ожидание загрузки телефонов (можно увеличить при необходимости)
    });
}

function createCSV(data) {
    const header = "ФИО;Телефон;Фото;Возраст;Опыт работы;Последнее место работы;Город;Ссылка";
    const rows = data.map(item =>
        `${item.name};${item.phone};${item.photo};${item.age};${item.experience};${item.lastJob};${item.city};${item.link}`
    );
    return [header, ...rows].join("\n");
}

function saveToFile(content, filename) {
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    link.click();
}
