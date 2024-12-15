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
            saveToExcel(data);
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

    return new Promise(resolve => {
        setTimeout(() => {
            const items = document.querySelectorAll('[data-qa="resume-serp__resume"]');
            const results = [];

            items.forEach(item => {
                let name = "------";
                const nameElementPrimary = item.querySelector('[data-qa="resume-serp__resume-fullname"]');
                const nameElementFallback = item.querySelector('[data-qa="serp-item__title-text"]');

                if (nameElementPrimary) {
                    name = nameElementPrimary.textContent.trim();
                } else if (nameElementFallback) {
                    name = nameElementFallback.textContent.trim();
                }

                const age = item.querySelector('[data-qa="resume-serp__resume-age"]')?.textContent.trim() || "------";
                const experience = item.querySelector('[data-qa="resume-serp_resume-item-total-experience-content"]')?.textContent.trim() || "------";

                const workplacesRaw = item.querySelector('[data-qa="resume-serp_resume-item-experience-content"]')?.textContent.trim() || "------";
                const workplaces = workplacesRaw.replace(/(\w+)([А-ЯЁ])/g, '$1 $2').replace(/\s+/g, ' ').split(/Подробнее о последнем месте/).join(' / ');

                const specialization = item.querySelector('[data-qa="resume-serp_resume-item-professional-roles-content"]')?.textContent.trim() || "------";
                const citizenship = item.querySelector('[data-qa="resume-serp_resume-item-citizenship-content"]')?.textContent.trim() || "------";

                const regionRaw = item.querySelector('[data-qa="resume-serp_resume-item-area-and-relocation-content"]')?.textContent.trim() || "------";
                const region = regionRaw.split(',')[0].trim(); // Оставляем только город

                const educationRaw = item.querySelector('[data-qa="resume-serp_resume-item-education-content"]')?.textContent.trim() || "------";
                const education = educationRaw.replace(/(\d{4})\s*•/g, '$1 / '); // Разделитель после года выпуска

                const languagesRaw = item.querySelector('[data-qa="resume-serp_resume-item-languages-content"]')?.textContent.trim() || "------";
                const languages = languagesRaw.replace(/([а-яА-ЯЁё]+ — [а-яА-ЯЁё]+)/g, '$1 / ').trim().replace(/\/ $/, ''); // Исправление разделителя

                // Телефоны
                let phone = "------";
                const primaryPhoneElement = item.querySelector('[data-qa="resume-phone resume-contact-preferred"]');
                const alternatePhoneElement = item.querySelector('[data-qa="resume-phone"]');

                if (primaryPhoneElement) {
                    phone = primaryPhoneElement.textContent.trim().replace(/[^\d]/g, ''); // Убираем +, пробелы, скобки, тире
                } else if (alternatePhoneElement) {
                    phone = alternatePhoneElement.textContent.trim().replace(/[^\d]/g, '');
                }

                const photo = item.querySelector('[data-qa="resume-card-avatar resume-card-avatar_with-user-photo"] img')?.src || "------";

                // Название вакансии
                const vacancyTitleElement = document.querySelector('[data-qa="vacancy-responses-breadcrumbs__vacancy-name-text"]');
                const vacancyTitle = vacancyTitleElement?.textContent.trim() || "------";

                const vacancyLink = window.location.href;

                // Ссылка на резюме
                const resumeLinkElement = item.querySelector('[data-qa="serp-item__title"]');
                const resumeLink = resumeLinkElement
                    ? `https://hh.kz${resumeLinkElement.getAttribute("href")}`
                    : "------";

                // Даты отклика и обновления
                let responseDate = "------";
                let updateDate = "------";

                const dateElementPrimary = item.querySelector('.magritte-text_style-secondary___1IU11_3-0-18');
                const dateElementFallback = item.querySelector('[class*="magritte-text"]');

                if (dateElementPrimary) {
                    responseDate = dateElementPrimary.textContent.match(/Откликнулся\s(.+?)•/)?.[1]?.trim() || "------";
                    updateDate = dateElementPrimary.textContent.match(/Обновлено\s(\d{2}\.\d{2}\.\d{4})/)?.[1] || "------"; // Оставляем только дату
                } else if (dateElementFallback) {
                    responseDate = dateElementFallback.textContent.match(/Откликнулся\s(.+?)•/)?.[1]?.trim() || "------";
                    updateDate = dateElementFallback.textContent.match(/Обновлено\s(\d{2}\.\d{2}\.\d{4})/)?.[1] || "------"; // Оставляем только дату
                }

                let messages = "------";
                const messageElements = item.querySelectorAll('[data-qa^="chatik-chat-message-"]');
                if (messageElements.length > 0) {
                    messages = Array.from(messageElements)
                        .map(msg => msg.textContent.trim())
                        .join("\n");
                }

                results.push({
                    "Название вакансии": vacancyTitle,
                    "Ссылка на вакансию": vacancyLink,
                    "Ссылка на резюме": resumeLink,
                    "ФИО": name,
                    "Возраст": age,
                    "Опыт работы": experience,
                    "Места работы": workplaces,
                    "Специализация": specialization,
                    "Гражданство": citizenship,
                    "Регион": region,
                    "Образование": education,
                    "Языки": languages,
                    "Телефон": phone,
                    "Фото": photo,
                    "Дата отклика": responseDate,
                    "Дата обновления": updateDate,
                    "Сообщения": messages
                });
            });

            resolve(results);
        }, 7000); // Задержка для корректной загрузки данных
    });
}

function saveToExcel(data) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Резюме");

    XLSX.writeFile(workbook, "resumes.xlsx");
}