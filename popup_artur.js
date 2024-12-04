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
    const phoneButtons = document.querySelectorAll('[data-qa="response-resume_show-phone-number"]');
    phoneButtons.forEach(button => button.click());

    const messageButtons = document.querySelectorAll('[data-qa="show-unread-resume-messages"]');
    messageButtons.forEach(button => button.click());

    return new Promise(resolve => {
        setTimeout(() => {
            const items = document.querySelectorAll('[data-qa="resume-serp__resume"]');
            const results = [];

            items.forEach(item => {
                const name = item.querySelector('[data-qa="resume-serp__resume-fullname"]')?.textContent.trim() || "------";
                const age = item.querySelector('[data-qa="resume-serp__resume-age"]')?.textContent.trim() || "------";
                const experience = item.querySelector('[data-qa="resume-serp_resume-item-total-experience-content"]')?.textContent.trim() || "------";
                const workplaces = item.querySelector('[data-qa="resume-serp_resume-item-experience-content"]')?.textContent.trim() || "------";
                const specialization = item.querySelector('[data-qa="resume-serp_resume-item-professional-roles-content"]')?.textContent.trim() || "------";
                const citizenship = item.querySelector('[data-qa="resume-serp_resume-item-citizenship-content"]')?.textContent.trim() || "------";
                const region = item.querySelector('[data-qa="resume-serp_resume-item-area-and-relocation-content"]')?.textContent.trim() || "------";
                const education = item.querySelector('[data-qa="resume-serp_resume-item-education-content"]')?.textContent.trim() || "------";
                const languages = item.querySelector('[data-qa="resume-serp_resume-item-languages-content"]')?.textContent.trim() || "------";
                const contacts = Array.from(item.querySelectorAll('[data-qa="resume-phone"]'))
                    .map(phoneEl => phoneEl.textContent.trim())
                    .join(", ") || "------";
                const phoneRequest = item.querySelector('[data-qa="resume-phone-description"]')?.textContent.trim() || "------";

                const photo = item.querySelector('[data-qa="resume-card-avatar resume-card-avatar_with-user-photo"] img')?.src || "------";

                const phone = Array.from(item.querySelectorAll('[data-qa="resume-phone"]'))
                    .map(phoneEl => phoneEl.textContent.trim())
                    .join(", ") || "------";

                let messages = "------";
                const messageElements = item.querySelectorAll('[data-qa^="chatik-chat-message-"]');
                if (messageElements.length > 0) {
                    messages = Array.from(messageElements)
                        .map(msg => msg.textContent.trim())
                        .join("\n");
                }

                results.push({
                    "ФИО": name,
                    "Возраст": age,
                    "Опыт работы": experience,
                    "Места работы": workplaces,
                    "Специализация": specialization,
                    "Гражданство": citizenship,
                    "Регион": region,
                    "Образование": education,
                    "Языки": languages,
                    "Контакты": contacts,
                    "Просьба": phoneRequest,
                    "Телефон": phone,
                    "Фото": photo,
                    "Сообщения": messages
                });
            });

            resolve(results);
        }, 3000);
    });
}

function saveToExcel(data) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Резюме");

    XLSX.writeFile(workbook, "resumes.xlsx");
}

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
            saveToExcel(data);
            loader.style.display = "none";
            status_mess.style.display = "block";
            status_mess.innerText = `Успешно загружено! Строк: ${data.length}`;
            status_mess.style.color = "green";
        }
    });
}

function saveToFile(content, filename) {
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    link.click();
}