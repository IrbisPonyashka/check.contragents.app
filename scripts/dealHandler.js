export default class DealCompanyHandler {
    constructor(entityId,entityElemId,fieldName,domain,inputElement,inputParent,tag,clear,loader,btnElement) {
        // this.appOptionPanel = document.querySelector("#app-settings");
        this.entityElemId = entityElemId;
        this.entityId = entityId;
        this.domain = domain;
        this.input = inputElement;
        this.fieldName = fieldName;
        this.inputParent = inputParent;
        this.infoTag = tag;
        this.btnClear = clear;
        this.iconLoader = loader;
        this.btnLink = btnElement;
        this.valueLength = 14;
        this.entity = "deal";
        this.messgeParent = document.querySelector("#success");
        this.messgeElement = document.querySelector("#success .ui-alert");
        this.btnLink.textContent = "Привязать";
        this.method = null;
        
        this.input.setAttribute("maxlength",this.valueLength);

        this.btnClear.addEventListener('click', (event) => this.clearInput()); //очистка поля
        this.getAccesses(); // сохранени токена авторизации в Localstorage
        this.input.value = localStorage.dealInn?localStorage.dealInn:"";

        if(this.entityElemId != 0){
            // if(this.isValidInn(input.value)){
            this.setFieldValue(this.input,this.fieldName); // запись значения в поле сущности, в аргумент передается названия поля
            // }
        }
        this.entityPreset = [];
        this.individualPreset =[];
        BX24.callMethod("app.option.get",{},
            async (appOption) => { 
                if(appOption.error()){
                    console.error(appOption.data());
                }else{
                    if(appOption.data().params){
                        this.renameCompanyTitle = JSON.parse(appOption.data().params.renameCompany);
                        this.renameContactTitle = JSON.parse(appOption.data().params.renameContact);
                        this.entityPreset = await this.getPreset({order: { "ID": "ASC" },filter: { "ID": appOption.data().params.EntityPresetId },select: [ "ID", "NAME"]	});
                        this.individualPreset = await this.getPreset({order: { "ID": "ASC" },filter: { "ID": appOption.data().params.IndividaulPresetId },select: [ "ID", "NAME"]	});
                    }
                }
            }
        );
        // this.appOptionPanel.addEventListener("click", (e) => {
        //     BX24.openApplication({
        //         'opened': true,
        //         'bx24_width': 580,// int
        //         'bx24_label': {
        //             'bgColor':'#FF550A', // aqua/green/orange/brown/pink/blue/grey/violet
        //             'text': 'Опции приложения',
        //             'color': '#fff',
        //         },
        //         // 'bx24_title': 'my title', // str
        //         //'bx24_leftBoundary': 300, //int
        //         },
        //         function(){
        //             console.log('Application closed!')
        //         }
        //     );
        // });
        this.input.addEventListener("input", (event) => this.processInputInDeal(event.target)); // Основная функция для сделок при вводе inpu
        this.btnLink.addEventListener('click', (event) => this.actionChangeInDeal());  // Основная функция для сделок при клике на кнопку 

        setTimeout(() => { 
            if(this.input.value!=""){
                this.input.value = this.input.value.trim().replace(' ', '').replace(' ','');
                this.processInputInDeal(this.input);
            }
        }, "500");
    }
    /* Для сделок */
    async processInputInDeal(target) { // процессе события input буду происходить только получение данных и установка конкретного статуса(действий) для события change 
        
        
        const inn = target.value.trim().replace(' ', '').replace(' ','');
        this.btnClear.style.display = inn.length > 0 ? "block" : "none" ;

        if (!this.isValidInn(inn)) {
            // this.setFieldStatus("danger",this.inputParent,this.infoTag,this.btnLink);
            this.setStatusToAction("invalid");
            return;
        }
        if( this.entityElemId == 0 ){
            this.setStatusToAction();
            if(inn.length == 9 || inn.length == 14 && this.isValidInn(inn) ){

                BX24.placement.call('setValue', inn);
                sessionStorage.setItem("dealInn",inn);

            }else if(inn.length>=1&&inn.length<=8){

                this.setStatusToAction("invalid","Введите 9 цифр для ИНН или 14 цифр для ПИНФЛ");

            }else if(target.value.length >= 10 && target.value.length <= 13){

                this.setStatusToAction("invalid","Введите 14 цифр для ПИНФЛ");

            }else{
                this.setStatusToAction("default");
            }
        }else{
            if(inn.length==9 || inn.length==14 && this.isValidInn(inn) ){
                
                const type = "company";
                const existingCompanyId = await this.getCompanyIdByInn(inn);
                const dealId = this.entityElemId;
                const actionStatus = await this.dealHasCompany(dealId, existingCompanyId, inn);
                
                /* возвращает null, если нет клиента у сделки, true - если у сделки есть клиент, false - такой клиент уже в этой сделке */   
                this.setLoading(true);
                if (existingCompanyId) { // привязка существующей компании
                    if(actionStatus == null){
                        this.btnLink.textContent = "Привязать";
                        this.setStatusToAction("binding",`${type=="contact"?"Контакт":"компания"} имеется в CRM`);
                    }else if(actionStatus != false && actionStatus != null){
                        this.btnLink.textContent = `Заменить ${type=="contact"?"контакт":"компанию"}`;
                        this.setStatusToAction("binding");
                    }else{
                        this.btnLink.textContent = `Заменить ${type=="contact"?"контакт":"компанию"}`;
                        this.setStatusToAction("equality",`${type=="contact"?"Контакт уже привязан к этой сделке":"Компания уже привязана к этой сделке"}`);
                    }
                    
                    BX24.placement.call('setValue', inn);

                    this.setLoading(false);
                } else { // создание и привязка компании
                    const gnk = await this.getDataAPI(inn);
                    
                    if(gnk==null || gnk == 404){
                        this.setStatusToAction("undefined");
                        this.setLoading(false);
                        return;

                    }else if(gnk==522){
                        this.setLoading(false);
                        this.setStatusToAction("undefined","Что-то пошло не так, попробуйте позже.");

                    }else{

                        const gnkCompanyTin = gnk.data.company_tin ?? null;
                        const gnkCompanyPinfl = gnk.data.gnk_company_director_pinfl ?? null;
                        console.log("gnk", gnk);
                        console.log("inn", inn);
                        console.log("gnkCompanyTin", gnkCompanyTin);
                        console.log("gnkCompanyPinfl", gnkCompanyPinfl);
                        console.log("actionStatus", actionStatus);

                        BX24.placement.call('setValue', inn);

                        if(actionStatus){
                            var currentCompanyRq = await this.getRqByEntityId(actionStatus);
                            console.log("currentCompanyRq", currentCompanyRq);
                            if(currentCompanyRq && (gnkCompanyTin == currentCompanyRq.RQ_INN || gnkCompanyPinfl == currentCompanyRq.RQ_INN)){
                                this.btnLink.textContent = `Заменить ${type=="contact"?"контакт":"компанию"}`;
                                this.setStatusToAction("equality",`${type=="contact"?"Контакт уже привязан к этой сделке":"Компания уже привязана к этой сделке"}`);
                            }else{
                                this.btnLink.textContent = `${type=="contact"?"Заменить контакт":"Заменить компанию"}`;
                                this.setStatusToAction("createWithBind"); // создание компании с заполненными реквизитами и привязка ее к сделке
                            }

                        }else{
                            // this.infoTag.textContent = "Реквизиты найдены";
                            this.btnLink.textContent = `${type=="contact"?"Привязать контакт":"Привязать компанию"}`;
                            this.setStatusToAction("createWithBind","Реквизиты найдены"); // создание компании с заполненными реквизитами и привязка ее к сделке
                        }
                        this.setLoading(false);
                    }
                }
                // this.setFieldStatus("primary",this.inputParent,this.infoTag,this.btnLink);
            }else if(inn.length>=1&&inn.length<=8){
                this.setStatusToAction("invalid","Введите 9 цифр для ИНН или 14 цифр для ПИНФЛ");
            }else if(target.value.length>=10&&target.value.length<=13){
                this.setStatusToAction("invalid","Введите 14 цифр для ПИНФЛ");
            }else{
                this.setStatusToAction("default");
            }
        }
    }

    /* Для сделок */
    async actionChangeInDeal(){ // доступно три статуса(действия) : createWithBind(создание и привязка), binding(привязка) и overwrite(создание и привязка существующей компании) 
        this.setLoading(true);
        const inn = this.input.value.trim().replace(' ', '').replace(' ','');
        
        const type = "company";
        var presetRq = [];
        if(type=="company"){
            presetRq = this.entityPreset;
        }else{
            presetRq = this.individualPreset;
        }
        
        const existingCompanyId = await this.getCompanyIdByInn(inn);
        const hasCompany = await this.dealHasCompany(this.entityElemId, existingCompanyId, inn);
        
        const dataAr = await this.getDataAPI(inn);
        const ndsStatus = await this.getNdsStatus(inn);
        
        dataAr.data.status_nds = ndsStatus;

            if(this.method == "createWithBind"){
                let createdCompanyId = await this.createCompanyByInn(dataAr,inn,presetRq[0],type);
                if(createdCompanyId){
                    this.setLoading(false);
                    let isLinked = await this.bindCompanyToDeal(createdCompanyId,hasCompany,this.entityElemId,this.domain ,dataAr,type);
                    if(isLinked){
                        BX24.placement.call('setValue', inn);
                        window.location.reload();
                        // window.top.location.href=`https://${this.domain}/crm/deal/details/${this.entityElemId}/`;
                        // this.showMessge(`<span class="ui-alert-message"><strong>Компания привязана</strong> Пожалуйста, обновите страницу.</span>`)
                    };
                }else{
                    this.setLoading(false);
                    this.setStatusToAction("error");
                }
            }else if(this.method == "binding" && existingCompanyId){
                this.setLoading(false);
                let isBinded = await this.bindCompanyToDeal(existingCompanyId,hasCompany,this.entityElemId,this.domain,dataAr,type);
                if(isBinded){
                    BX24.placement.call('setValue', inn);
                    window.location.reload();
                    // window.top.location.href=`https://${this.domain}/crm/deal/details/${this.entityElemId}/`;
                }
                // this.showMessge(`<span class="ui-alert-message"><strong>Компания привязана</strong> Пожалуйста, обновите страницу.</span>`);
            }
        // }
    }

    async createCompanyByInn(data,inn,preset,type){
        const arDataGnk = data.data;
            return new Promise((resolve, reject) => {

                if(arDataGnk.gnk_na1Name=="Семейное предприятие"){
                }else if(arDataGnk.gnk_na1Name=="Частное предприятие"){
                }else if(arDataGnk.gnk_na1Name=="Общество с огр. ответствен."){
                }
                // dataToUpdate[dynamicKey] = arDataGnk.company_tin; // ИНН
                // dataToUpdate[dynamicKey] = arDataGnk.gnk_company_director_pinfl; // ПИНФЛ
                
                var dataToUpdate = {}

                const directorBio = arDataGnk.gnk_company_director_name ? arDataGnk.gnk_company_director_name.split(' ') : false ; 
                
                if(type=="company"){
                    dataToUpdate.TITLE = arDataGnk.gnk_company_name;
                }else if(type=="contact"){
                    dataToUpdate.LAST_NAME = directorBio ? directorBio[0] : "";
                    dataToUpdate.NAME = directorBio ? directorBio[1] : "";
                    dataToUpdate.SECOND_NAME = directorBio ? directorBio[2] : "";
                }
                
                dataToUpdate.UF_CRM_1732280688058 = ""; // Банковские реквизиты
                dataToUpdate.UF_CRM_1730706873638 = ""; // Название банка
                dataToUpdate.UF_CRM_1732280758867 = arDataGnk.gnk_status_name;
                dataToUpdate.UF_CRM_1730706901979 = arDataGnk.gnk_company_address; // Юр. адрес компании
                dataToUpdate.UF_CRM_1730706882227 = arDataGnk.gnk_company_account; // Расчетный счет в банке
                dataToUpdate.UF_CRM_1730706896133 = arDataGnk.gnk_company_mfo; // МФО
                dataToUpdate.UF_CRM_1730706889624 = arDataGnk.gnk_company_oked; // ОКЭД
                dataToUpdate.UF_CRM_1732280703903 = directorBio ? directorBio[0]: ""; // Фамилия директора
                dataToUpdate.UF_CRM_1732280711686 = directorBio ? directorBio[1]: ""; // Имя директора
                dataToUpdate.UF_CRM_1730706908545 = arDataGnk.gnk_company_director_name ?? ""; // Статус плательщика НДС

                dataToUpdate[this.fieldName] = inn;
                BX24.callMethod(`crm.${type}.add`, {
                        fields:dataToUpdate,
                        params: { "REGISTER_SONET_EVENT": "N" }		
                    }, 
                    async (entity) => {
                        if(entity.error())
                            resolve(entity.error());
                        else{    
                            BX24.callBatch({
                                crmRequisiteAdd: {
                                    method:'crm.requisite.add',
                                    params: {
                                        fields:{ 
                                            "ENTITY_TYPE_ID":type=="contact"?3:4,
                                            "ENTITY_ID":entity.data(),
                                            "PRESET_ID":preset.ID,
                                            "ACTIVE":"Y",	
                                            "NAME" : preset.NAME+` ${arDataGnk.gnk_na1Name??''}`,
                                            "RQ_INN" : arDataGnk.company_tin ?? arDataGnk.gnk_company_director_pinfl,
                                            "RQ_COMPANY_NAME": arDataGnk.gnk_company_name,
                                            "RQ_COMPANY_FULL_NAME": arDataGnk.gnk_company_name_full,
                                            "RQ_DIRECTOR": arDataGnk.gnk_company_director_name + (arDataGnk.gnk_company_director_tin?` - ${arDataGnk.gnk_company_director_tin}`:'') + (arDataGnk.gnk_company_director_pinfl?` - ${arDataGnk.gnk_company_director_pinfl}`:''),
                                            "RQ_ACCOUNTANT": arDataGnk.gnk_company_accountant,
                                            "RQ_OKVED": arDataGnk.gnk_company_oked,
                                            "RQ_LAST_NAME": arDataGnk.gnk_company_director_name?directorBio[0]:"",//фамилия
                                            "RQ_FIRST_NAME": arDataGnk.gnk_company_director_name?directorBio[1]:"",//имя
                                            "RQ_SECOND_NAME": arDataGnk.gnk_company_director_name?directorBio[2]:"",//Отчество
                                            // "UF_CRM_RQ_PINFL" : arDataGnk.gnk_company_director_pinfl,
                                        }
                                    }
                                },
                                crmAddressAdd: {
                                    method: 'crm.address.add',
                                    params: {
                                        fields:{ 
                                            "TYPE_ID" : 6, // юр адресс
                                            "ENTITY_TYPE_ID" : 8, // реквизиты
                                            "ENTITY_ID" : '$result[crmRequisiteAdd]', // id реквизита
                                            "ADDRESS_1" : arDataGnk.gnk_company_address,
                                        }
                                    }
                                },
                                crmBankdetailAdd: {
                                    method: 'crm.requisite.bankdetail.add',
                                    params: {
                                        fields:{ 
                                            "ENTITY_ID" : '$result[crmRequisiteAdd]', // id реквизита
                                            "COUNTRY_ID" : 1,
                                            "NAME" : "Первичный счёт",
                                            "RQ_BIK" : arDataGnk.gnk_company_mfo,
                                            "RQ_ACC_NUM" : arDataGnk.gnk_company_account,		
                                            "RQ_ACC_CURRENCY" : "Узбекский сум",
                                        }
                                    }
                                }
                            },(result) => {
                                resolve(entity.data());
                            });
                        }
                    }
                );
            });
            
    }

    async bindCompanyToDeal(companyId,hasCompany,dealId,domain,dataAr,type)
    {
        return new Promise( async (resolve, reject) => {
            // const company = await this.getCompanyIdById(companyId);
            let arCompanyContacts = await this.getCompanyBindedContacts(companyId);
            const arCompanyContactsIds = arCompanyContacts.map((e) => e.CONTACT_ID );
            const arDataGnk = dataAr.data;
            // Данные из компании
            var objFields = {};

            objFields.COMPANY_ID = companyId; 
            
            arCompanyContactsIds && arCompanyContactsIds.length ?
                objFields.CONTACT_IDS = arCompanyContactsIds :
                null ; 
            
            objFields[this.fieldName] = arDataGnk.company_tin ?? arDataGnk.gnk_company_director_pinfl;
            const directorBio = arDataGnk.gnk_company_director_name ? arDataGnk.gnk_company_director_name.split(' ') : false ; 

            objFields.UF_CRM_1732280369451 = ""; // Банковские реквизиты
            objFields.UF_CRM_1732280375361 = arDataGnk.gnk_company_address; // Юр. адрес компании
            objFields.UF_CRM_1732280382385 = arDataGnk.gnk_company_account; // Расчетный счет в банке
            objFields.UF_CRM_1732280387561 = ""; // Название банка
            objFields.UF_CRM_1732280392608 = arDataGnk.gnk_company_mfo; // МФО
            objFields.UF_CRM_1732280399368 = arDataGnk.gnk_company_oked; // ОКЭД
            objFields.UF_CRM_1732280407535 = directorBio ? directorBio[0]: ""; // Фамилия директора
            objFields.UF_CRM_1732280414071 = directorBio ? directorBio[1]: ""; // Имя директора
            objFields.UF_CRM_1732280420925 = arDataGnk.gnk_status_name; // Статус плательщика НДС

            BX24.callMethod("crm.deal.update", { 
                id: this.entityElemId,
                fields:objFields,
                params: { "REGISTER_SONET_EVENT": "Y" }			
                },(result) => {
                    if(result.error())
                        console.error(result.error());
                    else{
                        if(hasCompany){
                            BX24.callMethod(`crm.${type}.get`, 
                            { id: hasCompany }, 
                            (company) => {
                                if(company.error()){
                                    console.error(company.error());
                                }else{
                                    BX24.callMethod("crm.timeline.comment.add",{
                                            fields:{
                                                "ENTITY_ID": dealId,
                                                "ENTITY_TYPE": "deal",
                                                "COMMENT": `${type=='contact'?'Контакт был заменен':'Компания была заменена'}. При необходимости удалите ${type=='contact'?'предыдущий':'предыдущую'} - <a href="https://${domain}/crm/${type}/details/${hasCompany}/">${company.data().TITLE}</a>.`
                                            }
                                        },function(messge){
                                            if(messge.error()){
                                                console.error(messge.error());
                                            }else{
                                                console.info("Добавлен новый комментарий. ID - " + messge.data());
                                                resolve(true);	
                                            }
                                        }
                                    );
                                } 
                            });
                        }else{
                            resolve(true);
                        }					
                    }
                }
            );
        });
        
    }

    async getDataAPI(inn){
        try {
            
            const tokenData = sessionStorage.getItem('token');
            if (!tokenData) {
                throw new Error('Token not found in sessionStorage');
            }
            
            const { access_token } = JSON.parse(tokenData);
            
            var myHeaders = new Headers();
            myHeaders.append("Authorization", `Bearer ${access_token}`);

            var requestOptions = {
                method: 'GET',
                headers: myHeaders,
                redirect: 'follow'
            };
            
            const response = await fetch(`https://api.multibank.uz/api/check_contragent/v1/gnk/${inn}?refresh=1`, requestOptions);

            // if (!response.ok && result.message === "Unauthorized") {
            //     console.error('Network response was not ok', response.statusText);
            //     throw new Error(`HTTP error! Status: ${response.status}`);
            // }

            const result = await response.json();

            console.log("result",result);
            // Обработка ошибок авторизации
            if (result.message === "Unauthorized") {
                sessionStorage.removeItem("token");
                await this.getAccesses();
                return this.getDataAPI(inn); // Повторный вызов функции
            } else if (result.success) {
                return result;
            } else {
                console.warn('API returned an error:', result);
                return result.code;
            }
            
            // return fetch(`https://api.multibank.uz/api/check_contragent/v1/general/${inn}?refresh=0`, requestOptions)
            // return fetch(`https://api.multibank.uz/api/check_contragent/v1/gnk/${inn}?refresh=1`, requestOptions)
            // .then(response => response.text())
            // .then(result => {
            //     if(JSON.parse(result).success){
            //         return JSON.parse(result);
            //     }else{
            //         return JSON.parse(result).code;
            //     }
            // })
            // .catch(error => console.log('error', error));
        } catch (error) {
            console.log(error);
        }

    }


    async getNdsStatusPromise(inn){
        var myHeaders = new Headers();
        myHeaders.append("Authorization", `Bearer ${JSON.parse(sessionStorage.token).access_token}`);

        var requestOptions = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
        };
        let currentDate = new Date();
        let year = currentDate.getFullYear(); 
        let month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); 
        let day = currentDate.getDate().toString().padStart(2, '0'); 
        let formattedDate = `${year}-${month}-${day}`;

        return fetch(`https://api.multibank.uz/api/edm/gnk/taxpayer_type?tin_or_pinfl=${inn}&date=${formattedDate}`, requestOptions)
        .then(res => res.ok ? res : Promise.reject(res))
        .then(res => { return res.json()})
        .catch(error => {return error.status});
    }

    async getNdsStatus(inn) {
        try {
            const dataAPI = await this.getNdsStatusPromise(inn);
            if(dataAPI){
                return dataAPI.data.name;
            }else{
                return "";
            }
        } catch (error) {
            return "";
        }
    }
    
    setFieldValue(input,name){
        if(sessionStorage.dealInn){
            input.value = sessionStorage.dealInn;

            var dynamicKey = name; 
            var dataToUpdate = {};
            dataToUpdate[dynamicKey] = input.value;
            
            BX24.callMethod("crm.deal.update", {
                id: this.entityElemId,
                fields:dataToUpdate 
            }, function(result) {
                if(result.error()){
                    console.error(result.error());
                }else{
                    sessionStorage.removeItem("dealInn");
                }
            });
        }else{
            BX24.callMethod("crm.deal.get", { 
                id: this.entityElemId
            }, 
            (deal) => {
                if(deal.error()){
                    console.error(deal.error());
                    return null;
                }else{
                    if(deal.data()[name] && deal.data()[name] != "undefined" && this.isValidInn(deal.data()[name]) )
                    {
                        input.value = deal.data()[name];
                        let fields = {};
                        fields[name] = deal.data()[name];
                        BX24.callMethod("crm.deal.update", {
                            id: deal.data().ID,
                            fields:fields
                        }, function(updres) {
                            if(updres.error()){
                                console.error(updres.error());
                            }else{
                            }
                        });
                    }
                }
            });
        }
    }
    
    // setValueToStorageField(inn,name = this.fieldName){
    //     // if(this.entityElemId==200296){
    //         var dataToUpdate = {
    //             "UF_CRM_1668149033260":inn
    //         };
    //         dataToUpdate[name] = inn;
    //         BX24.callMethod("crm.deal.update", {
    //             id: this.entityElemId,
    //             fields:dataToUpdate
    //         }, function(result) {
    //             if(result.error()){
    //                 console.error(result.error());
    //             }else{
    //                 console.log("из поискового поля сохранено в поле для хранения");
    //             }
    //         });
    //     // }
    // }

    async getAccesses()
    {
        return new Promise((resolve, reject) => {
            BX24.callMethod("app.option.get",{},
                function(result){ 
                if(result.error()){
                    console.error(result.data());
                }else{
                    let params = result.data();
                    if(!sessionStorage.token){
                        const client_id = '8';
                        const client_secret = 'kV6eVfCQ1u1iVR6Def4K5mMQc9M1NG5t9PS4K1IJ';
                        // var myHeaders = new Headers();
                        // myHeaders.append("Authorization", "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIyIiwianRpIjoiZjE4MjhhYWVhMTZkY2JjODEzMzI1NTljYjQ0MmY3YTRhYmVjNmY1ZDE3NTE4ODYwZmVmYjE4OWNhOWIwNDdhNzk2MDZkYWEyYzkwMzcyNmYiLCJpYXQiOjE2ODk1Njk5MzguMjE3NjQxLCJuYmYiOjE2ODk1Njk5MzguMjE3NjQ3LCJleHAiOjE2ODk2NTYzMzguMTg1NjI2LCJzdWIiOiI0OTBkOGEyZi1iZDhjLTQwY2EtYmNmNy02Y2FhMjBhOTJkMTAiLCJzY29wZXMiOlsiKiJdfQ.f504EQ3tS58BpLjLyTmp0CS_ZaTNWX6DWABajorCfjnxhRKLmfOcoRsTOYabtkRP6sI4n34viQ6rYGWnE_iRe9--2Kv7nAkUNXiMcmT-DOq2jQb-xYbWU0QhhrdYh9YstgoTZDn-R2hanvY8BmQ2nccHK8gqB7u295wlxsM8kAbiR4HhmchAUHS9kGW_wAkSD-H5Yt2ChAg3w0A1LImzF_QzVx90yqZgS_-C9LBsbfE3ovVWtZnKu-9V8bcV12XKF7GR9thR-MrMLeQwg-WVKHytXuiID_-o3WDQGyOB7qkXoR6SdsAptey04iVDSpSRK0678Je5_VB74ZrJVBePz9pIrh-AjbWYWmRksIc8y7QolcHU6sLpmXlq0bSvvTKJiZDggKckFAzJqZEWfHjw8LHbC7_JZINbvipDxs0Xoddi_hClO1ONTOMgI_rMbNxhPwkPuRZXBHvbmvMMeU3IGlv-O3iDvZEGmJgg_7Him6v2oWwE_hoxTsTp-zPt_Bys3i-QIGNg8YxKhu2Ic227n1GnCLNWPOY8IaaPy5HUVVdhgBFzowWWuIiFi_HkZ8Whxn7LWRXL_uve8MZ508EPddQZoqtFffRFJ9tD8tSn9gY9TvMg7A_bB8wbUG3OMcoCdu7B75Bth5nZ_q0CIDFbFtp9Meh2batndtf2RLYhcOY");

                        var formdata = new FormData();
                        formdata.append("client_id", client_id);
                        formdata.append("client_secret", client_secret);
                        formdata.append("username", params.login);
                        formdata.append("password", params.password);
                        formdata.append("scope", "");
                        formdata.append("grant_type", "password");

                        var requestOptions = {
                            method: 'POST',
                            body: formdata,
                            redirect: 'follow'
                        };

                        fetch("https://auth.multibank.uz/oauth/token", requestOptions)
                        .then(response => response.text())
                        .then(result => {
                            sessionStorage.setItem("token",result);
                            resolve(true);
                        })
                        .catch(error => console.log('error', error));
                    }
                }
            });
        });
    }
    async getCompanyIdByInn(inn) {
        // Здесь получаем ID компании по ИНН
        // Верните null, если компания с таким ИНН не найдена, иначе верните ID компании
        // const gnkObject = await this.getDataAPI(inn);
        // let getEntity = function(inn){
            return new Promise((resolve, reject) => {
                let filter = { "RQ_INN": inn};
                // filter.ENTITY_TYPE_ID = inn.length == 14 ? 3 : 4;
                filter.ENTITY_TYPE_ID = 4;
                BX24.callMethod("crm.requisite.list",{
                    filter: filter,
                    select: [ "ID", "NAME","RQ_COMPANY_NAME","ENTITY_ID","RQ_INN"]
                    },function(rq_inn) {
                        if (rq_inn.error()) {
                            console.error("ERROR: " + rq_inn.error());
                            resolve(null); // Верните null, если компания с таким ИНН не найдена
                        } else {
                            console.log(rq_inn.data());
                            if(rq_inn.data().length){
                                resolve(rq_inn.data()[0].ENTITY_ID); // Возвращаем ID компании
                            }else{
                                resolve(null); // Возвращаем null
                            }
                        }
                    }
                );
            });
        // };
        // var hasEntity = await getEntity(inn);
        // if(hasEntity==null){
        //     let pinflOrInn = inn==gnkObject.data.company_tin?gnkObject.data.gnk_company_director_pinfl:gnkObject.data.company_tin;
        //     var entity = pinflOrInn==null?false:await getEntity(pinflOrInn); 
        //     return entity;
        // }else{
        //     return hasEntity;
        // }

    }
    async getCompanyIdById(id) {
        // Здесь получаем компанию по ID
        // Верните null, если компания с таким ID не найдена, иначе верните компанию
        return new Promise((resolve, reject) => {
            BX24.callMethod("crm.company.get", {
                id: id ,
            }, function (company) {
                if (company.error()) {
                    console.error("ERROR: " + company.error());
                    resolve(null); // Верните null, если компания с таким ШВ не найдена
                } else {
                    resolve(company.data()); // Возвращаем компанию
                }
            });
        });
    }

    async getCompanyBindedContacts(company_id) {
        // Здесь получаем компанию по ID
        // Верните null, если компания с таким ID не найдена, иначе верните компанию
        return new Promise((resolve, reject) => {
            BX24.callMethod("crm.company.contact.items.get", {
                id: company_id ,
            }, function (result) {
                if (result.error()) {
                    console.error("ERROR: " + result.error());
                    resolve(null); // Верните null, если компания с таким ШВ не найдена
                } else {
                    resolve(result.data()); // Возвращаем компанию
                }
            });
        });
    }

    
    async dealHasCompany(dealId, companyId, inn) {
        // Проверяем, привязана ли компания с таким ID к сделке с таким ID
        // Верните true, если привязана, и false, если нет	
        return new Promise((resolve, reject) => {    
            BX24.callMethod("crm.deal.get", { id: dealId}, 
                (result) => {
                    if(result.error()){
                        console.error(result.error());
                        return null;
                    }else{
                        // if(inn.length==14){
                        //     if(result.data().CONTACT_ID==0 || result.data().CONTACT_ID==null){
                        //         resolve(null); // у сделки нет компании
                        //     }else if(result.data().CONTACT_ID==companyId){
                        //         resolve(false); // "Компания уже привязана к этой сделке";
                        //     }else{
                        //         resolve(result.data().CONTACT_ID); // "Перезаписать"; у сделки есть компания
                        //     }
                        // }else{
                            if(result.data().COMPANY_ID==0 || result.data().COMPANY_ID==null){
                                resolve(null); // у сделки нет компании
                            }else if(result.data().COMPANY_ID==companyId){
                                resolve(false); // "Компания уже привязана к этой сделке";
                            }else{
                                resolve(result.data().COMPANY_ID); // "Перезаписать"; у сделки есть компания
                            }
                        // }
                    }
                }
            );
        })
        // return false;
    }

    async getRqByEntityId(companyId) {
        // Проверяем, привязана ли компания с таким ID к сделке с таким ID
        // Верните true, если привязана, и false, если нет	
        return new Promise((resolve, reject) => {    
            BX24.callMethod(
                "crm.requisite.list",
                {
                    filter: { "ENTITY_ID": companyId}, // Идентификатор реквизита
                },
                (result) => {
                    if(result.error())
                        reject(result.error());
                    else{
                        if(result.data().length > 0){
                            resolve(result.data()[0]);        
                        }else{
                            resolve(false);
                        }
                    }
                }
            );
        })
        // return false;
    }


    async getPreset(fields) 
    {
        return new Promise((resolve, reject) => {
            BX24.callMethod("crm.requisite.preset.list", fields,function(result) {
                    if(result.error()){
                        resolve(null);
                    }else{
                        resolve(result.data());
                    }
                }
            );
        });
    }

    showMessge(messge){
        this.messgeElement.innerHTML=messge;
        this.inputParent.style.display="none";
        this.messgeParent.style.display="block";
    }

    cleanSpaces(e){
        e.preventDefault();
        var pastedText = '';
        if (window.clipboardData && window.clipboardData.getData) {
            pastedText = window.clipboardData.getData('Text');
        } else if (e.clipboardData && e.clipboardData.getData) {
            pastedText = e.clipboardData.getData('text/plain');
        }
        this.value = pastedText.replace(/\s/g, '');
    };
    
    clearInput(){
        this.input.value="";
    }

    setLoading(bool){
        if(bool){
            this.btnClear.style.display="none";
            this.iconLoader.style.display="block";
        }else{
            this.btnClear.style.display="block";
            this.iconLoader.style.display="none";
        }
    }

    isValidInn(inn) {
        // Проверьте, что ИНН состоит из 10 или 14 цифр (в зависимости от страны) и соответствует формату
        // if(!isNaN(inn.value))
        if(inn.length!=0){
            return /^[-+]?\d+(\.\d*)?$/.test(inn);
        }else{
            return true;
        }
    }

    setFieldStatus(selector,input,tag,btn){
        let selectors = ["primary","success","warning","danger","disabled"];
        let classInputPart = 'ui-ctl-',
        classBtnPart = 'ui-btn-',
        classTagPart = 'ui-ctl-tag-';
        selectors.forEach(el => {
            input.classList.contains(`${classInputPart}${el}`) ? input.classList.remove(`${classInputPart}${el}`) : "";
            btn.classList.contains(`${classBtnPart}${el}`) ? btn.classList.remove(`${classBtnPart}${el}`) : "";
            tag.classList.contains(`${classTagPart}${el}`) ? tag.classList.remove(`${classTagPart}${el}`) : "";
            if(el==selector){
                input.classList.add(`${classInputPart}${selector}`);
                btn.classList.add(`${classBtnPart}${selector}`);
                tag.classList.add(`${classTagPart}${selector}`);
            }
        })
        // this.setMessgStatus(selector);
    }   

    setStatusToAction(action,text){
        this.method=action;
        if(action == "equality"){;
            this.infoTag.textContent = text?text:"Компания уже привязанна к этой сделке";
            this.setFieldStatus("warning",this.inputParent,this.infoTag,this.btnLink);
            this.btnLink.setAttribute('disabled',true);
        }else if(action == "load" || action == "default"){
            this.infoTag.textContent = "Введите 9 цифр для ИНН или 14 цифр для ПИНФЛ";
            this.setFieldStatus("primary",this.inputParent,this.infoTag,this.btnLink);
            this.btnLink.removeAttribute('disabled');
        }else if(action == "binding"){
            // this.infoTag.textContent = text?text:"Привязать";
            this.infoTag.textContent = text?text:"Введите 9 цифр для ИНН или 14 цифр для ПИНФЛ";
            this.setFieldStatus("success",this.inputParent,this.infoTag,this.btnLink);
            this.btnLink.removeAttribute('disabled');
        }else if(action == "createWithBind"){
            this.infoTag.textContent = text?text:"Введите 9 цифр для ИНН или 14 цифр для ПИНФЛ";
            this.setFieldStatus("success",this.inputParent,this.infoTag,this.btnLink);
            this.btnLink.removeAttribute('disabled');
        }else if(action == "invalid"){
            this.btnLink.setAttribute('disabled',true);
            this.infoTag.textContent = text?text:"Некорректный формат ИНН";
            this.setFieldStatus("danger",this.inputParent,this.infoTag,this.btnLink);
        }else if(action == "error"){
            this.btnLink.setAttribute('disabled',true);
            this.infoTag.textContent = "Что-то пошло не так, попробуйте еще раз!";
            this.setFieldStatus("danger",this.inputParent,this.infoTag,this.btnLink);
        }else if(action == "undefined"){
            this.btnLink.setAttribute('disabled',true);
            this.infoTag.textContent = text?text:"ИНН не найден";
            this.setFieldStatus("warning",this.inputParent,this.infoTag,this.btnLink);
        }else{
            this.infoTag.textContent = text?text:"Привязка будет доступна после сохранения сделки";
            this.setFieldStatus("primary",this.inputParent,this.infoTag,this.btnLink);
            this.btnLink.setAttribute('disabled',true);
        }
    }

}