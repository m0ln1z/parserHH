const grabBtn = document.getElementById("grabBtn");
const loader = document.getElementById("loader");
const status_mess = document.getElementById("status_mess");

grabBtn.addEventListener("click", (e) => {
	loader.style.display = "block";
	grabBtn.style.display = "none";
	chrome.tabs.query({ active: true }, function (tabs) {
		var tab = tabs[0];
		tab ? execScript(tab) : alert("Нет активных вкладок");
	});
});

function execScript(tab) {
	chrome.scripting.executeScript({
		target: { tabId: tab.id, allFrames: true },
		func: () => {
			let phones = document.querySelectorAll("[data-qa='response-resume_show-phone-number']");
			let i = document.querySelectorAll('[data-qa="resume-contacts-phone"]').length;
			for (let phone of phones) {
				phone.click();
			}
			return i;
		}
	}).then((Result) => {
		let itemCount = 0;
		for (let resultElement of Result) {
			itemCount += resultElement.result;
		}
		setTimeout(() => {
			chrome.scripting.executeScript({
				target: { tabId: tab.id, allFrames: true },
				func: grabPhone
			}).then(injectionResults => {
				let res = [];
				for (const { frameId, result } of injectionResults) {
					res = [...res, ...result];
				}
				if (!itemCount) {
					loader.style.display = "none";
					status_mess.style.display = "block";
					status_mess.innerText = "Нет данных для обработки!";
					return false;
				}
				let toFile = "ФИО; Ссылка; Телефон; Фото; Возраст; Опыт; Последнее место работы; Город";
				for (let item of res) {
					toFile += `\n${item.name}; ${item.link}; ${item.phone}; ${item.photo}; ${item.age}; ${item.experienceTotal}; ${item.lastJob}; ${item.city}`;
				}
				saveFile(toFile, frames, itemCount);
			});
		}, itemCount * 300);
	});
}

function grabPhone() {
	let info = [];
	let all = document.querySelectorAll('[data-qa="vacancy-real-responses"] .serp-item');
	
	all.forEach((item) => {
		let phones = item.querySelectorAll('[data-qa="resume-phone"], [data-qa="resume-phone resume-contact-preferred"]');
		let photo = item.querySelector('[data-qa="resume-card-avatar resume-card-avatar_with-user-photo"] img');
		let age = item.querySelector('[data-qa="resume-serp__resume-age"]');
		let experienceTotal = item.querySelector('[data-qa="resume-serp_resume-item-total-experience-content"]');
		let lastJob = item.querySelector('[data-qa="resume-serp_resume-item-experience-content"]');
		let city = item.querySelector('[data-qa="resume-serp_resume-item-area-and-relocation-content"]');
		let name = item.querySelector('[data-qa="resume-serp__resume-fullname"]');
		
		if (Object.keys(phones).length) {
			let infoRes = {
				link: item.querySelector('[data-qa="serp-item__title"]').href,
				name: name?.childNodes?.length && typeof (name.childNodes[0].data) != 'undefined' ? name.childNodes[0].data : "------",
				phone: Array.from(phones).map(phoneItem => phoneItem.innerHTML).join(", ").replace(/[ +()-]/g, ""),
				photo: photo ? photo.src : "------",
				age: age ? age.textContent.trim() : "------",
				experienceTotal: experienceTotal ? experienceTotal.textContent.trim() : "------",
				lastJob: lastJob ? lastJob.textContent.trim() : "------",
				city: city ? city.textContent.trim() : "------"
			};
			info.push(infoRes);
		}
	});
	return info;
}

function saveFile(str, frame, rowCount) {
	if (rowCount) {
		// Создаем массив байтов для BOM UTF-8
		const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
		// Создаем массив байтов из строки в кодировке UTF-8
		const utf8Bytes = new TextEncoder().encode(str);
		// Объединяем массивы байтов: BOM и UTF-8
		const blobParts = [bom, utf8Bytes];
		// Создаем Blob объект
		const blob = new Blob(blobParts, { type: 'text/plain;charset=utf-8' });
		
		let link = document.createElement("a");
		link.setAttribute("href", URL.createObjectURL(blob));
		link.setAttribute("download", Date.now() + ".csv");
		link.click();
		link.remove();
		loader.style.display = "none";
		status_mess.style.display = "block";
		status_mess.innerText = `Успешно загружено!\n Строк: ${rowCount}`;
		status_mess.style.color = "green";
		setTimeout(frame.close, 5000);
	}
}
