
document.addEventListener("DOMContentLoaded", async (event) =>{

    const syncBtn = document.getElementById("sync-btn");
    const stopBtn = document.getElementById("resume-btn");
    const resumeBtn = document.getElementById("resume-btn-2");
    const clearLogBtn = document.getElementById("clear-log");
    const logBox = document.getElementById("log");

    async function setStatus()
    {
        let app_options = await getAppOptions();
        let crm_deal_manual_update = app_options.crm_deal_manual_update;
        if (typeof crm_deal_manual_update !== "object" || crm_deal_manual_update === null) {
            crm_deal_manual_update = {};
        }
        let category_id = document.querySelector("#category_id").value;
        console.log("crm_deal_manual_update", crm_deal_manual_update);
        
        document.querySelector("#deal_manual_update_count").innerText =     `${crm_deal_manual_update[category_id]?.count ?? '_'}`;
        document.querySelector("#deal_manual_update_id").innerHTML =        crm_deal_manual_update[category_id]?.last_deal_id ?
            `<a href="https://b24.alphacon.uz/crm/deal/details/${crm_deal_manual_update[category_id].last_deal_id}/" target="_blank">#${crm_deal_manual_update[category_id].last_deal_id}</a>`
            : "_";
        document.querySelector("#deal_manual_update_update_at").innerText = `${crm_deal_manual_update[category_id]?.update_at ?? "_"}`;
        return true;
    }
    setStatus();

    function getCurrentTimeFormatted() {
        let now = new Date();
        
        let dd = String(now.getDate()).padStart(2, '0');
        let mm = String(now.getMonth() + 1).padStart(2, '0'); // Месяцы от 0 до 11
        let yyyy = now.getFullYear();
        
        let hh = String(now.getHours()).padStart(2, '0');
        let min = String(now.getMinutes()).padStart(2, '0');
        let ss = String(now.getSeconds()).padStart(2, '0');
    
        return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`;
    }

    function addLog(message) {
        logBox.innerHTML += `<p>${message}</p>`;
        document.getElementById("log").scrollTop = document.getElementById("log").scrollHeight;
    }

    async function callMethod(method, fields)
    {
        return new Promise((resolve, reject) => {
            BX24.callMethod(method, fields, (result) => resolve(result.data()));
        })
    } 

    async function getCompanyByTinGNK(inn, tokens = null, retryCount = 3) {

        let headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tokens.access_token ?? ""}`
        };

        let response = await fetch(`https://api.multibank.uz/api/check_contragent/v1/gnk/${inn}?refresh=1`, { headers });

        let data = await response.json();
        if (data.success)
        {
            return data;
        }
        else if (data.message === "Unauthorized" && retryCount > 0)
        {
            let newTokens = await multibankRefreshAuthTokens(tokens);
            return getCompanyByTinGNK(inn, newTokens, retryCount - 1);
        } else {
            return { error: data.message };
        }
    }


    async function multibankNewAuthTokens()
    {
        let appOption = await getAppOptions();
        
        let arParams = {
            'client_id': '8',
            'client_secret': 'kV6eVfCQ1u1iVR6Def4K5mMQc9M1NG5t9PS4K1IJ',
            'username': appOption.login,
            'password': appOption.password,
            'scope': '',
            'grant_type': 'password',
        };

        let response = await fetch("https://auth.multibank.uz/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(arParams)
        });

        let data = await response.json();
        console.log("data", data);

        if( !data.error )
        {
            let newAppOption = {
                "multibank_auth": {
                    "access_token": data.access_token,
                    "refresh_token": data.refresh_token
                }
            };

            let setAppOption = await setAppOptions({"options": newAppOption });
            console.log("setAppOption", setAppOption);
            if(setAppOption["error"]){
                data["success"] = true;
                return data;
            }else{
                return data;
            }

        }else{
            
            data["success"] = false;
            return data;
        }
    }
    
    async function multibankRefreshAuthTokens(tokens)
    {
        let arParams = {
            'client_id': '8',
            'client_secret': 'kV6eVfCQ1u1iVR6Def4K5mMQc9M1NG5t9PS4K1IJ',
        };

        if(tokens.refresh_token) {
            arParams.refresh_token = tokens.refresh_token;
        }else{
            let appOption = await getAppOptions();
            if(appOption["error"]) {
                return appOption;
            }else{
                appOption = appOption["result"];
            }

             arParams['refresh_token'] = appOption["multibank_auth"]["refresh_token"];
        } 
        let response = await fetch("https://api.multibank.uz/api/profiles/v1/profile/refresh_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(arParams)
        });

        let data = await response.json();
        console.log("data", data);

        if( !data.error )
        {
            let newAppOption = {
                "multibank_auth": {
                    "access_token": data.access_token,
                    "refresh_token": data.refresh_token
                }
            };

            let setAppOption = await setAppOptions({"options": newAppOption });
            console.log("setAppOption", setAppOption);
            if(setAppOption["error"]){
                data["success"] = true;
                return data;
            }else{
                return data;
            }

        }else if(data.message == "The refresh token is invalid.") {
            return multibankNewAuthTokens();
        }else{
            
            data["success"] = false;
            return data;
        }
    }

    async function getCompanyByTinCRM(inn)
    {
        return new Promise((resolve, reject) => {
            BX24.callMethod("crm.requisite.list", {
                "filter": { "RQ_INN": inn }
            }, (result) => resolve(result.data()));
        })
    }

    async function requisiteCreate(companyId, inn, arDataGnk, type) {
        let presetName, presetId;
        if (type === "entity") {
            presetName = "Юр. лицо Узбекистан";
            presetId = 1;
        } else {
            presetName = "ИП";
            presetId = 2;
        }
    
        let directorBio = arDataGnk.gnk_company_director_name
            ? arDataGnk.gnk_company_director_name.split(" ")
            : ["", "", ""];
    
        let fields = {
            fields: {
                "RQ_INN": inn,
                "ENTITY_TYPE_ID": 4,
                "ENTITY_ID": companyId,
                "PRESET_ID": presetId,
                "ACTIVE": "Y",
                "NAME": presetName,
                "RQ_COMPANY_NAME": arDataGnk.gnk_company_name,
                "RQ_COMPANY_FULL_NAME": arDataGnk.gnk_company_name_full,
                "RQ_DIRECTOR": arDataGnk.gnk_company_director_name,
                "RQ_ACCOUNTANT": arDataGnk.gnk_company_accountant,
                "RQ_OKVED": arDataGnk.gnk_company_oked,
                "RQ_PHONE": "",
                "RQ_LAST_NAME": directorBio[0] || "",
                "RQ_FIRST_NAME": directorBio[1] || "",
                "RQ_SECOND_NAME": directorBio[2] || ""
            },
            params: { REGISTER_SONET_EVENT: "N" }
        };
    
        let requisiteRes = await callMethod("crm.requisite.add", fields);
    
        if (requisiteRes) {
            let requisiteId = requisiteRes;
    
            let adresFields = {
                fields: {
                    "TYPE_ID": 6,
                    "ENTITY_TYPE_ID": 8,
                    "ENTITY_ID": requisiteId,
                    "ADDRESS_1": arDataGnk.gnk_company_address
                }
            };
    
            let bankDetailFields = {
                fields: {
                    "ENTITY_ID": requisiteId,
                    "COUNTRY_ID": 1,
                    "NAME": "Первичный счёт",
                    "RQ_BANK_NAME": arDataGnk.bank_name || "",
                    "RQ_BIK": arDataGnk.gnk_company_mfo,
                    "RQ_ACC_NUM": arDataGnk.gnk_company_account,
                    "RQ_ACC_CURRENCY": "Узбекский сум"
                }
            };
    
            await callMethod("crm.address.add", adresFields);
            await callMethod("crm.requisite.bankdetail.add", bankDetailFields);
    
            return requisiteId;
        } else {
            return null;
        }
    }
    
    async function createCompany(companyData, inn)
    {
        companyData = companyData.data;
        let type = inn.length === 9 ? "entity" : "individual";

        let directorBio = companyData.gnk_company_director_name
            ? companyData.gnk_company_director_name.split(" ")
            : ["", "", ""];
    
        let fields = {
            fields: {
                "TITLE":                        companyData["gnk_company_name_full"],
                "UF_CRM_CHECK_CONTRAGENTS":     inn, // ИНН
                "UF_CRM_1732280688058":         "", // Банковские реквизиты
                "UF_CRM_1730706873638":         "", // Название банка
                "UF_CRM_1732280758867":         companyData["gnk_status_name"], // Банковские реквизиты
                "UF_CRM_1730706901979":         companyData["gnk_company_address"], // Юр. адрес компании
                "UF_CRM_1730706882227":         companyData["gnk_company_account"], // Расчетный счет в банке
                "UF_CRM_1730706896133":         companyData["gnk_company_mfo"], // МФО
                "UF_CRM_1730706889624":         companyData["gnk_company_oked"], // ОКЭД
                "UF_CRM_1732280703903":         directorBio ? directorBio[0]: "", // Фамилия директора
                "UF_CRM_1732280711686":         directorBio ? directorBio[1]: "", // Имя директора
                "UF_CRM_1730706908545":         companyData["gnk_company_director_name"] ?? "", // Статус плательщика НДС
            },
            params: {"REGISTER_SONET_EVENT": "N"}
        };
    
        if (type === "individual") {
            fields.fields.LAST_NAME = directorBio[0] || "";
            fields.fields.NAME = directorBio[1] || "";
            fields.fields.SECOND_NAME = directorBio[2] || "";
        }
        
        let response = await callMethod("crm.company.add", fields);
        if (response) {
            let companyId = response;
            let requisiteId = await requisiteCreate(companyId, inn, companyData, type);
    
            return {
                compeny_res: companyId,
                requisite_res: requisiteId
            };
        } else {
            return null;
        }
    }
    
    function isValidInn(inn) {
        if(inn.length!=0){
            return /^[-+]?\d+(\.\d*)?$/.test(inn);
        }else{
            return true;
        }
    }

    async function getAppOptions ()
    {
        return new Promise((resolve, reject) => {
            BX24.callMethod("app.option.get", {}, (result) => resolve(result.data()));
        })
    } 

    async function setAppOptions (options)
    {
        return new Promise((resolve, reject) => {
            BX24.callMethod("app.option.set", options, (result) => resolve(result.data()));
        })
    } 

    async function getDealList(filter)
    {
        return new Promise((resolve, reject) => {
            BX24.callMethod("crm.deal.list", {
                filter: filter,
                select: ["ID", "TITLE", "UF_CRM_CHECK_CONTRAGENTS", "COMPANY_ID", "CATEGORY_ID"],
            }, (result) => resolve(result.data()));
        })
    } 

    async function startSyncProcess()
    {
        let appOptions = await getAppOptions();
        let crm_deal_manual_update = appOptions.crm_deal_manual_update;
        let category_id = document.querySelector("#category_id").value;
        let category_text = document.querySelector("#category_id").selectedOptions.item(document.querySelector("#category_id").selectedOptions).text;

        let filter = {
            "<UF_CRM_CHECK_CONTRAGENTS": "9",
            "COMPANY_ID": 0,
            "CATEGORY_ID": category_id,
            // "CATEGORY_ID": "2",
        };
        crm_deal_manual_update[category_id]?.last_deal_id ? filter[">ID"] = crm_deal_manual_update[category_id].last_deal_id : false;
        console.log("crm_deal_manual_update", crm_deal_manual_update);
        console.log(filter);
        addLog(`Синхронизация воронки - <b>${category_text}</b>`);
        await syncProcess(filter, appOptions);
    }

    async function syncProcess(filter, appOptions)
    {   
        let category_id = document.querySelector("#category_id").value;
        let crm_deal_manual_update = appOptions.crm_deal_manual_update ?? {};
        let count = crm_deal_manual_update[category_id]?.count ?? 0;
        let id = crm_deal_manual_update[category_id]?.id ?? 0;

        while (stopBtn.style.display === "block")
        {
            let dealList = await getDealList(filter);
            if (dealList.length > 0) {
                for (const deal of dealList) {
                    // console.log("crm_deal_manual_update", crm_deal_manual_update);
                    console.log("count, id", count, id);
                    if (stopBtn.style.display === "none") { 
                        await setSyncProcess();
                        return;
                    }

                    const inn = deal["UF_CRM_CHECK_CONTRAGENTS"].trim().replace(/\s+/g, '');
                    
                    if (!isValidInn(inn)) {
                        addLog(`Не корректное ИНН. <a href='https://b24.alphacon.uz/crm/deal/details/${deal.ID}/' target='_blank'>#Сделка</a>`);
                        await new Promise(resolve => setTimeout( () => {
                            console.log("inn", inn);
                            // stopBtn.dataset.id = id = deal.ID;
                            // stopBtn.dataset.count = ++count;
                            resolve();
                        }, 500));
                        continue;
                    }
        
                    let rqFilter = {
                        "RQ_INN": inn,
                        "ENTITY_TYPE_ID": 4
                    };
        
                    let companyGNK = await getCompanyByTinGNK(inn, appOptions["multibank_auth"]);
                    console.log("companyGNK", companyGNK);

                    if (companyGNK.success && companyGNK.data) {
                        let crmReqsList = await getCompanyByTinCRM(inn);
                        console.log("crmReqsList", crmReqsList);
                        
                        let arUpdDealFields = {};
                        let crmReqsData = crmReqsList[0];
        
                        let directorBio = companyGNK.data.gnk_company_director_name ? 
                                          companyGNK.data.gnk_company_director_name.split(" ") : false;
        
                        if (crmReqsData) {
                            arUpdDealFields = {
                                "COMPANY_ID": crmReqsData.ENTITY_ID,
                                "UF_CRM_1732280369451": "",
                                "UF_CRM_1732280375361": companyGNK.data.gnk_company_address,
                                "UF_CRM_1732280382385": companyGNK.data.gnk_company_account,
                                "UF_CRM_1732280387561": "",
                                "UF_CRM_1732280392608": companyGNK.data.gnk_company_mfo,
                                "UF_CRM_1732280399368": companyGNK.data.gnk_company_oked,
                                "UF_CRM_1732280407535": directorBio ? directorBio[0] : "",
                                "UF_CRM_1732280414071": directorBio ? directorBio[1] : "",
                                "UF_CRM_1732280420925": companyGNK.data.gnk_status_name
                            };
                            
                            
                            let dealUpdRes = await callMethod("crm.deal.update", {
                                "ID": deal.ID,
                                "FIELDS": arUpdDealFields,
                                "PARAMS": { 'REGISTER_SONET_EVENT': 'Y' }
                            });
                            console.log("Привязка компании -> arUpdDealFields", dealUpdRes);
                            stopBtn.dataset.id = id = deal.ID;
                            stopBtn.dataset.count = ++count;
                            await setSyncProcess();
                            addLog(`Обновлена и привязана компания - <a href='https://b24.alphacon.uz/crm/company/details/${crmReqsData.ENTITY_ID}/' target='_blank'>${crmReqsData.RQ_COMPANY_FULL_NAME}</a> к сделке - <a href='https://b24.alphacon.uz/crm/deal/details/${deal.ID}/' target='_blank'>${deal.TITLE}</a>`);
        
                            if (dealUpdRes) {
                                let crmCompanyByID = await callMethod("crm.company.get", { "ID": crmReqsData.ENTITY_ID });
        
                                if (crmCompanyByID) {
                                    await callMethod("crm.timeline.comment.add", {
                                        "fields": {
                                            "ENTITY_ID": deal.ID,
                                            "ENTITY_TYPE": "deal",
                                            "COMMENT": `Компания была заменена. При необходимости удалите предыдущую - 
                                            <a href="https://b24.alphacon.uz/crm/company/details/${crmReqsData.ENTITY_ID}/">
                                            ${crmCompanyByID.TITLE}</a>.`
                                        }
                                    });
                                }
                            }
                            
                            if (stopBtn.style.display === "none") { 
                                await setSyncProcess();
                                return;
                            }
                        } else {
                            // Если реквизиты не найдены, создаем новую компанию
                            let newCompanyWithRq = await createCompany(companyGNK, inn);
                            console.log("Новая компания -> newCompanyWithRq", newCompanyWithRq);
        
                            if (newCompanyWithRq.compeny_res) {
                                arUpdDealFields = {
                                    "COMPANY_ID": newCompanyWithRq.compeny_res,
                                    "UF_CRM_1732280369451": "",
                                    "UF_CRM_1732280375361": companyGNK.data.gnk_company_address,
                                    "UF_CRM_1732280382385": companyGNK.data.gnk_company_account,
                                    "UF_CRM_1732280387561": "",
                                    "UF_CRM_1732280392608": companyGNK.data.gnk_company_mfo,
                                    "UF_CRM_1732280399368": companyGNK.data.gnk_company_oked,
                                    "UF_CRM_1732280407535": directorBio ? directorBio[0] : "",
                                    "UF_CRM_1732280414071": directorBio ? directorBio[1] : "",
                                    "UF_CRM_1732280420925": companyGNK.data.gnk_status_name
                                };
                                
                                console.log("Новая компания -> arUpdDealFields", arUpdDealFields);

                                let dealUpdRes = await callMethod("crm.deal.update", {
                                    "ID": deal.ID,
                                    "FIELDS": arUpdDealFields,
                                    "PARAMS": { 'REGISTER_SONET_EVENT': 'Y' }
                                });
                                console.log("Привязка компании -> arUpdDealFields", dealUpdRes);
                                stopBtn.dataset.id = id = deal.ID;
                                stopBtn.dataset.count = ++count;
                                await setSyncProcess();
                                addLog(`Обновлена и привязана <a href='https://b24.alphacon.uz/crm/company/details/${newCompanyWithRq.compeny_res}/' target='_blank'>${companyGNK.data.gnk_company_name_full}</a> к сделке - <a href='https://b24.alphacon.uz/crm/deal/details/${deal.ID}/' target='_blank'> ${deal.TITLE} </a>`);
            
                                if (dealUpdRes) {
                                    let crmCompanyByID = await callMethod("crm.company.get", { "ID": newCompanyWithRq.compeny_res });
            
                                    if (crmCompanyByID) {
                                        await callMethod("crm.timeline.comment.add", {
                                            "fields": {
                                                "ENTITY_ID": deal.ID,
                                                "ENTITY_TYPE": "deal",
                                                "COMMENT": `Компания была заменена. При необходимости удалите предыдущую - 
                                                <a href="https://b24.alphacon.uz/crm/company/details/${newCompanyWithRq.compeny_res}/">
                                                ${crmCompanyByID.TITLE}</a>.`
                                            }
                                        });
                                    }
                                }
                                
                                if (stopBtn.style.display === "none") { 
                                    await setSyncProcess();
                                    return;
                                }
                            }
                        }
                    } else {
                        console.log("Ошибка получения данных компании:", companyGNK);
                    }
                }
            }        
            else
            {
                addLog("Нет сделок для обновления");
                syncBtn.style.display = "block";
                stopBtn.style.display = "none";
            }
            // return
            
            // array.forEach(element => {
                
            // });
        }
        
    } 
    
    /**
     * @int id - deal id
    */
    async function setSyncProcess()
    {
        await setStatus();
        let appOptions = await getAppOptions();
        let category_id = document.querySelector("#category_id").value;
        let crm_deal_manual_update = appOptions.crm_deal_manual_update;
        if (typeof crm_deal_manual_update !== "object" || crm_deal_manual_update === null) {
            crm_deal_manual_update = {};
        }
        
        let count = crm_deal_manual_update[category_id] && crm_deal_manual_update[category_id].count ? crm_deal_manual_update[category_id].count : 0;

        crm_deal_manual_update[category_id] = {
            count: stopBtn.dataset.count,
            last_deal_id: stopBtn.dataset.id,
            update_at: getCurrentTimeFormatted()
        };
        
        console.log("crm_deal_manual_update", crm_deal_manual_update);
        
        await setAppOptions({
            options: {
                "crm_deal_manual_update": crm_deal_manual_update
            }
        });
    }


    document.querySelector("#category_id").addEventListener("change", async (e) => {
        console.log(e.target.value);
        setStatus();
    });

    syncBtn.addEventListener("click", async () => {
        syncBtn.style.display = "none";
        stopBtn.style.display = "block";
        
        startSyncProcess();
        // BX24.callMethod("some.method.startUpdate", {}, function (result) {
        // 	if (result.error()) {
        // 		addLog("Ошибка: " + result.error_description);
        // 		syncBtn.style.display = "block";
        // 		stopBtn.style.display = "none";
        // 	} else {
        // 		addLog("Обновление успешно запущено!");
        // 	}
        // });
    });

    stopBtn.addEventListener("click", async () => {
        stopBtn.style.display = "none";
        resumeBtn.style.display = "block";
        addLog("Обновление остановлено.");

        // BX24.callMethod("some.method.stopUpdate", {}, function (result) {
        // 	if (result.error()) {
        // 		addLog("Ошибка: " + result.error_description);
        // 		stopBtn.style.display = "block";
        // 		resumeBtn.style.display = "none";
        // 	}
        // });
    });

    resumeBtn.addEventListener("click", function () {
        resumeBtn.style.display = "none";
        stopBtn.style.display = "block";
        addLog("Обновление продолжается...");

        startSyncProcess();
        // BX24.callMethod("some.method.resumeUpdate", {}, function (result) {
        // 	if (result.error()) {
        // 		addLog("Ошибка: " + result.error_description);
        // 		resumeBtn.style.display = "block";
        // 		stopBtn.style.display = "none";
        // 	}
        // });
    });

    clearLogBtn.addEventListener("click", function () {
        logBox.innerHTML = "<p>Ожидание действий...</p>";
    });

});