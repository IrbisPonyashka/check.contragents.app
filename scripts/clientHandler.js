
export default class clientHandler { /* класс который выполняет ряд функций такие как, поиск реквизитов по ИНН, создание компании с заполненными реквизитами, создание реквизита для компании и обновление реквизитов */
    constructor(entityId,entityElemId,fieldName,domain,inputElement,inputParent,tag,clear,loader,btnElement) {
        this.entityId = entityId;
        this.entityElemId = entityElemId;
        this.fieldName = fieldName;
        this.domain = domain;
        this.input = inputElement;
        this.inputParent = inputParent;
        this.infoTag = tag;
        this.btnClear = clear;
        this.iconLoader = loader;
        this.btnLink = btnElement;
        this.btnDeleteContainer=btnElement.parentElement.cloneNode(true);
        this.btnDelete=this.btnDeleteContainer.querySelector("button");
        this.messgeParent = document.querySelector("#success");
        this.messgeElement = document.querySelector("#success .ui-alert");

        this.btnLink.textContent = "Создать";
        this.requisite = null;
        this.method = null;
        this.inputFieldValue = null;
        this.valueLength = entityId=="CRM_CONTACT"?14:9;
        this.entity = entityId=="CRM_CONTACT"?"contact":"company"; // Вставляеться в название метода при вызове( crm.company.add./crm.contact.add и тд)

        this.input.setAttribute("maxlength",this.valueLength);
        this.input.addEventListener("input", (event) => this.processInput(event.target)); 
        this.btnLink.addEventListener('click', (event) => this.actionChange());  
        this.btnDelete.addEventListener('click', (event) => this.deleteEntity(event));  
        
        // this.input.addEventListener('keyup', function(event) { event.target.value = this.value.replace(' ', '') }); // очистка от пробелов при вводе
        this.btnClear.addEventListener('click', (event) => this.clearInput()); //очистка поля
        this.getAccesses(); // сохранение токена авторизации в Localstorage
        if(this.entityElemId!=0){
            this.setFieldValue(this.input,this.fieldName); // запись значения в поле сущности, в аргумент передается названия поля
        }

        setTimeout(() => { 
            if(this.input.value!=""){
                this.input.value = this.input.value.trim().replace(' ', '').replace(' ','');
                this.processInput(this.input);
            }
        }, "1000");

    }
    async processInput(target) {
        const inn = target.value.trim().replace(' ', '').replace(' ','');
        this.btnClear.style.display = inn.length>0?"block":"none";
        if(this.btnDeleteContainer.parentElement!=null){
            this.inputParent.removeChild(this.btnDeleteContainer);
            this.btnDelete.setAttribute("disabled",true);
        }

        if (!this.isValidInn(inn)) {
            this.setStatusToAction("invalid");
            return;
        }

        if(this.entityElemId==0){
            this.setStatusToAction();
            if(inn.length==this.valueLength && this.isValidInn(inn)){
                sessionStorage.setItem("entityInn",inn);
                // const companyIdWithInn = await this.hasCompanyWithInn(inn,this.entityElemId); //есть ли в crm компания с веденным инн, если есть возвращает id, иначе false
                // if(companyIdWithInn!=this.entityElemId&&companyIdWithInn!=null){
                //     this.btnLink.textContent = "Перейти в компанию";
                //     this.setStatusToAction("link",`найдено дубликатов: ${companyIdWithInn.length}`); // перенапрвляем
                // }
            }else if(inn.length>=1&&inn.length<=this.valueLength){
                this.setStatusToAction("invalid","Введите 9 цифр");
            }else{
                this.setStatusToAction("default");
            }
        }else{
            if(inn.length==this.valueLength && this.isValidInn(inn)){
                this.setLoading(true);
                this.setStatusToAction("default","поиск...");
                const rqLinked = await this.hasThisRq(inn);
                const companyIdWithInn = await this.hasCompanyWithInn(inn,this.entityElemId); //есть ли в crm компания с веденным инн, если есть возвращает id, иначе false
                const dataApi = await this.getDataAPIbyInn(inn);
                if(dataApi!=null && isNaN(dataApi)){
                    if(companyIdWithInn==false){ // создание 
                        if(rqLinked!=false){ // создаем компанию с реквизитами 
                            this.btnLink.textContent = "Создать компанию";
                            this.setStatusToAction("createAll");
                        }else{ // создаем 
                            this.btnLink.textContent = "Создать";
                            this.setStatusToAction("create");
                        }
                    }else if(Array.isArray(companyIdWithInn)==false){ //обновление карточки , тк id совпадает с id текущей сущности 
                        this.requisite = companyIdWithInn.ID;
                        this.btnLink.textContent = "Обновить компанию";
                        this.setStatusToAction("update");
                    }else{  // перенапрвляем или удаляем (на выбор пользователю)
                        // this.btnDelete = deleteBtnContainer.querySelector("button");
                        this.editSelectors("ui-btn-danger","ui-btn-disabled",this.btnDelete);
                        this.editSelectors("ui-btn-danger","ui-btn-primary",this.btnDelete);
                        this.btnDelete.removeAttribute("disabled");
                        this.inputParent.appendChild(this.btnDeleteContainer);
                        this.btnDelete.textContent = "Удалить компанию";
                        this.btnLink.textContent = "Перейти в компанию";
                        this.setStatusToAction("link",`найдено дубликатов: ${companyIdWithInn.length}`);
                    }
                    this.setLoading(false);
                }else if(dataApi==522){
                    this.setLoading(false);
                    this.setStatusToAction("undefined","Что-то пошло не так, попробуйте позже.");
                }else{
                    this.setLoading(false);
                    this.setStatusToAction("undefined");
                }
            }else if(target.value.length>=1&&target.value.length<=this.valueLength){
                this.setStatusToAction("invalid","Введите 9 цифр");
            }else{
                this.setStatusToAction("default");
            }
        }

    }

    async actionChange(){ // только при изменении в карточки, 4 действия : Создание, Обновление, Перейти к элементу сущности, Создать элемент сущности
        if(this.entityElemId==0){

        } 
        this.setLoading(true);
        const inn = this.input.value.trim().replace(' ', '').replace(' ','');;
        const dataApi = await this.getDataAPIbyInn(inn);
        const presetRq = await this.getPreset(this.entity=="company"?"Юр. лицо Узбекистан":"Физ. лицо Узбекистан");
        // if(inn.length==this.valueLength){
            if(this.method=="create"){
                const createdRQ = await this.companyRqAdd(dataApi,presetRq);
                if(createdRQ){
                    window.top.location.href=`https://${this.domain}/crm/${this.entity}/details/${this.entityElemId}/`;
                }
            }else if(this.method=="createAll"){
                const createdCompanyWithRQ = await this.createCompanyWithRq(dataApi,presetRq,this.fieldName,inn);
                if(createdCompanyWithRQ){
                    this.setStatusToAction("link","Компания создана и заполнена");
                    this.btnLink.textContent = "Перейти в компанию";
                    let link = document.createElement("a");
                    link.style.display="none";
                    link.target="_blank";
                    link.href=`https://${this.domain}/crm/${this.entity}/details/${createdCompanyWithRQ}/`;
                    document.querySelector("#check__btn-container").appendChild(link);
                    link.click();
                }
            }else if(this.method=="update" && this.requisite!=null){
                const updateRQ = await this.companyRqUpdate(dataApi,presetRq,this.entityElemId,this.requisite,inn);
                if(updateRQ){
                    window.top.location.href=`https://${this.domain}/crm/${this.entity}/details/${this.entityElemId}/`;
                    // this.showMessge(`<span class="ui-alert-message"><strong>Реквизиты Обновлены.</strong> Пожалуйста, обновите страницу.</span>`)
                }
            }else if(this.method=="link"){
                const companyIdWithInn = await this.hasCompanyWithInn(inn,this.entityElemId);
                    let link = document.createElement("a");
                    link.style.display="none";
                    link.target="_blank";
                    link.href=`https://${this.domain}/crm/${this.entity}/details/${companyIdWithInn[0].ENTITY_ID}/`;
                    document.querySelector("#check__btn-container").appendChild(link);
                    link.click();
            }
        this.setLoading(false);     
        // }
    }

    async deleteEntity(event, ENTITY = this.entity){
        const inn = this.input.value.trim().replace(' ', '').replace(' ','');
        const domain = this.domain;
        const entityID = this.entityElemId;
        const companyIdWithInn = await this.hasCompanyWithInn(inn,entityID);
        BX24.callMethod(`crm.${this.entity}.delete`, 
            { id: entityID }, 
            function(result) {
                if(result.error()){
                    console.log(result.error());
                }else{
                    let link = document.createElement("a");
                    link.style.display="none";
                    link.target="_blank";
                    link.href=`https://${domain}/crm/${ENTITY}/details/${companyIdWithInn[0].ENTITY_ID}/`;
                    document.querySelector("#check__btn-container").appendChild(link);
                    link.click();
                    window.top.location.href=`https://${domain}/crm/${ENTITY}/details/${entityID}/`;
                }
            }
        );
    }

    async getDataAPIbyInnPromise(inn){
        var myHeaders = new Headers();
        myHeaders.append("Authorization", `Bearer ${JSON.parse(sessionStorage.token).access_token}`);

        var requestOptions = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
        };

        // return fetch(`https://api.multibank.uz/api/check_contragent/v1/general/${inn}?refresh=0`, requestOptions)
        return fetch(`https://api.multibank.uz/api/check_contragent/v1/gnk/${inn}?refresh=0`, requestOptions)
        .then(res => res.ok ? res : Promise.reject(res))
        .then(res => { return res.json()})
        .catch(error => {return error.status});

    }
    async getDataAPIbyInn(inn) {
        try {
            const dataAPI = await this.getDataAPIbyInnPromise(inn);
            var value;
            if(isNaN(dataAPI)){
                value = this.entity == "company" ? dataAPI.data.company_tin:dataAPI.data.gnk_company_director_pinfl;
            }
            if(dataAPI==undefined || dataAPI>400 || value==null){
                if(dataAPI==401){
                    sessionStorage.removeItem("token");
                }else if(dataAPI==undefined){
                    // sessionStorage.removeItem("token");
                    return 522;
                }else if(dataAPI==522){
                    return 522;
                }else{
                    return null;
                }
            }else{
                return dataAPI;
            }
        } catch (error) {
            return error;
            // console.error(error);
        }
    }

    async hasCompanyWithInnPromise(inn,entityId,ENTITY=this.entity){
        return new Promise((resolve, reject) => {
            if(ENTITY=="company"){
                var filterObj = { "RQ_INN": inn};
            }else{
                var filterObj = { "UF_CRM_RQ_PINFL": inn};
            }
            BX24.callMethod("crm.requisite.list",{
                filter: filterObj,
                select: [ "ID", "NAME","RQ_COMPANY_NAME","ENTITY_ID"]
                },function(result) {
                    if(result.error())
                        resolve(result.error());
                    else{
                        if(result.data().length>0){
                            const arrId = result.data().filter(el => el.ENTITY_ID==entityId);
                            if(arrId[0]!=undefined){
                                resolve(arrId[0]);
                            }else{
                                resolve(result.data());
                            }
                        }else{
                            resolve(false);
                        }
                    }
                }
            );
        });
    }
    async hasCompanyWithInn(inn,entityId){
        try {
            const hasRq = await this.hasCompanyWithInnPromise(inn,entityId);
            return hasRq;
        } catch (error) {
            console.log(error);
        }

    }

    async hasThisRqPromise(){
        return new Promise((resolve, reject) => {
            BX24.callMethod("crm.requisite.list",{
                filter: { "ENTITY_ID": this.entityElemId},
                select: [ "ID", "NAME","RQ_COMPANY_NAME"]
                },function(result) {
                    if(result.error())
                        console.error(result.error());
                    else{
                        if(result.data().length>0){
                            resolve(result.data());
                        }else{
                            resolve(false);
                        }
                    }
                }
            );
        });
    }
    async hasThisRq(){
        try {
            const hasRq = await this.hasThisRqPromise();
            return hasRq;
        } catch (error) {
            console.log(error);
        }

    }

    async createCompanyWithRqPromise(arDataGnk,preset,fieldName,inn){ // создание компании с реквизитами (PROMISE)
        return new Promise((resolve, reject) => {
            
            const directorBio = arDataGnk.gnk_company_director_name.split(' '); 
            
            var dataToUpdate = {
                "TITLE":arDataGnk.gnk_company_name_full,
                // "BANKING_DETAILS" : `` 
            }
            dataToUpdate[fieldName] = inn;
            BX24.callMethod(`crm.${this.entity}.add`, {
                    fields:dataToUpdate,
                    params: { "REGISTER_SONET_EVENT": "Y" }		
                }, 
                async function(entity) {
                    if(entity.error())
                        resolve(entity.error());
                    else{    
                        if(preset.NAME=="Юр. лицо Узбекистан"){
                            BX24.callMethod("crm.requisite.add", {
                                fields:{ 
                                    "ENTITY_TYPE_ID":4,
                                    "ENTITY_ID":entity.data(),
                                    "PRESET_ID":preset.ID,
                                    "ACTIVE":"Y",	
                                    "NAME" : preset.NAME,
                                    "RQ_INN" : arDataGnk.company_tin,
                                    "RQ_COMPANY_NAME": arDataGnk.gnk_company_name,
                                    "RQ_COMPANY_FULL_NAME": arDataGnk.gnk_company_name_full,
                                    "RQ_DIRECTOR": arDataGnk.gnk_company_director_name,
                                    "RQ_ACCOUNTANT": arDataGnk.gnk_company_accountant,
                                    "RQ_OKVED": arDataGnk.gnk_company_oked,
                                    "RQ_PHONE": "",
                                }
                                }, function(rqste) {
                                    if(rqste.error()){
                                        resolve(rqste.error());
                                    }else{
                                        BX24.callMethod("crm.address.add", {
                                                fields:{ 
                                                    "TYPE_ID" : 6, // юр адресс
                                                    "ENTITY_TYPE_ID" : 8, // реквизиты
                                                    "ENTITY_ID" : rqste.data(), // id реквизита
                                                    "ADDRESS_1" : arDataGnk.gnk_company_address,
                                                }        
                                            }
                                        );
                                        BX24.callMethod("crm.requisite.bankdetail.add", {
                                            fields:{ 
                                                "ENTITY_ID" : rqste.data(), // id реквизита
                                                "COUNTRY_ID" : 1,
                                                "NAME" : "Первичный счёт",
                                                "RQ_BIK" : arDataGnk.gnk_company_mfo,
                                                "RQ_ACC_NUM" : arDataGnk.gnk_company_account,		
                                                "RQ_ACC_CURRENCY" : "Узбекский сум",		
                                            }
                                        }, function(rqBank) {
                                                if(rqBank.error()){
                                                    resolve(rqBank.error());
                                                }else{
                                                    resolve(entity.data()); // возвращаем id компании
                                                }
                                            }
                                        );
                                    }
                                }
                            );
                        }else{              
                            BX24.callMethod("crm.requisite.add", {
                                fields:{ 
                                    "ENTITY_TYPE_ID":3,
                                    "ENTITY_ID":entity.data(),
                                    "PRESET_ID":preset.ID,
                                    "ACTIVE":"Y",	
                                    "NAME" : preset.NAME,
                                    "RQ_LAST_NAME": arDataGnk.gnk_company_director_name?directorBio[0]:"",//фамилия
                                    "RQ_FIRST_NAME": arDataGnk.gnk_company_director_name?directorBio[1]:"",//имя
                                    "RQ_SECOND_NAME": arDataGnk.gnk_company_director_name?directorBio[2]:"",//Отчество
                                    "UF_CRM_RQ_PINFL" : arDataGnk.gnk_company_director_pinfl,
                                }
                                }, function(rqste) {
                                    if(rqste.error()){
                                        resolve(rqste.error());
                                    }else{
                                        /* 
                                            BX24.callMethod("crm.address.add", {
                                                    fields:{ 
                                                        "TYPE_ID" : 6, // юр адресс
                                                        "ENTITY_TYPE_ID" : 8, // реквизиты
                                                        "ENTITY_ID" : rqste.data(), // id реквизита
                                                        "ADDRESS_1" : arDataGnk.gnk_company_address,
                                                    }        
                                                }
                                            );
                                            BX24.callMethod("crm.requisite.bankdetail.add", {
                                                fields:{ 
                                                    "ENTITY_ID" : rqste.data(), // id реквизита
                                                    "COUNTRY_ID" : 1,
                                                    "NAME" : "Первичный счёт",
                                                    "RQ_BIK" : arDataGnk.gnk_company_mfo,
                                                    "RQ_ACC_NUM" : arDataGnk.gnk_company_account,		
                                                    "RQ_ACC_CURRENCY" : "Узбекский сум",		
                                                }
                                            }, function(rqBank) {
                                                    if(rqBank.error()){
                                                        resolve(rqBank.error());
                                                    }else{
                                                    }
                                                }
                                            );
                                        */
                                        resolve(entity.data()); // возвращаем id компании
                                    }
                                }
                            );
                        }
                    }
                }
            );
        });
    }
    async createCompanyWithRq(obj,preset,fieldName,inn) { // создание компании с реквизитами
        try {
            const id = await this.createCompanyWithRqPromise(obj.data,preset,fieldName,inn); 
            return id; // возвращаем id компании
        } catch (error) {
            console.error(error);
            // return error;
        }
    }

    async companyRqAddPromise(arDataGnk,preset,enitiyId,inn,fieldName,ENTITY=this.entity){
        return new Promise((resolve, reject) => {
            if(preset.NAME=="Юр. лицо Узбекистан"){
                BX24.callMethod("crm.requisite.add", {
                    fields:{ 
                        "ENTITY_TYPE_ID":4,
                        "ENTITY_ID":this.entityElemId,
                        "PRESET_ID":preset.ID,
                        "ACTIVE":"Y",	
                        "NAME" : preset.NAME,
                        "RQ_INN" : arDataGnk.company_tin,
                        "RQ_COMPANY_NAME": arDataGnk.gnk_company_name,
                        "RQ_COMPANY_FULL_NAME": arDataGnk.gnk_company_name_full,
                        "RQ_DIRECTOR": arDataGnk.gnk_company_director_name,
                        "RQ_ACCOUNTANT": arDataGnk.gnk_company_accountant,
                        "RQ_OKVED": arDataGnk.gnk_company_oked,
                        "RQ_PHONE": "",
                    }
                    }, function(rqste) {
                        if(rqste.error()){
                            resolve(rqste.error());
                        }else{                 
                            BX24.callMethod("crm.address.add", {
                                    fields:{ 
                                        "TYPE_ID" : 6, // юр адресс
                                        "ENTITY_TYPE_ID" : 8, // реквизиты
                                        "ENTITY_ID" : rqste.data(), // id реквизита
                                        "ADDRESS_1" : arDataGnk.gnk_company_address,
                                    }        
                                }
                            );
                            BX24.callMethod("crm.requisite.bankdetail.add", {
                                fields:{ 
                                    "ENTITY_ID" : rqste.data(), // id реквизита
                                    "COUNTRY_ID" : 1,
                                    "NAME" : "Первичный счёт",
                                    "RQ_BIK" : arDataGnk.gnk_company_mfo,
                                    "RQ_ACC_NUM" : arDataGnk.gnk_company_account,		
                                    "RQ_ACC_CURRENCY" : "Узбекский сум",		
                                }
                            }, function(rqBank) {
                                    if(rqBank.error()){
                                        console.error(rqBank.error());
                                    }
                                }
                            );
                        }
                        BX24.callMethod("app.option.get",
                            {"option":"renameCompany"},
                            function(result){ 
                            if(result.error()){
                                console.error(result.data());
                            }else{
                                let companyName = result.data()==="false"?"":arDataGnk.gnk_company_name;
                                let directorBio = arDataGnk.gnk_company_director_name.split(' '); 
                                
                                var dynamicKey = fieldName; 
                                var dataToUpdate = {
                                    "TITLE":companyName,
                                }
                                dataToUpdate[dynamicKey] = inn;
                                BX24.callMethod(`crm.${ENTITY}.update`, { 
                                        id: enitiyId,
                                        fields:dataToUpdate,
                                        params: { "REGISTER_SONET_EVENT": "Y" }				
                                    }, function(result) {
                                        if(result.error()){
                                            console.error(result.error());
                                        }else{
                                            resolve(result.data());
                                        }
                                    }
                                );
                            }
                        })
                    }
                );
            }else{    
                let directorBio = arDataGnk.gnk_company_director_name.split(' ');  
                BX24.callMethod("crm.requisite.add", {
                    fields:{ 
                        "ENTITY_TYPE_ID":3,
                        "ENTITY_ID":this.entityElemId,
                        "PRESET_ID":preset.ID,
                        "ACTIVE":"Y",	
                        "NAME" : preset.NAME,
                        "RQ_LAST_NAME": arDataGnk.gnk_company_director_name?directorBio[0]:"",//фамилия
                        "RQ_FIRST_NAME": arDataGnk.gnk_company_director_name?directorBio[1]:"",//имя
                        "RQ_SECOND_NAME": arDataGnk.gnk_company_director_name?directorBio[2]:"",//Отчество
                        "UF_CRM_RQ_PINFL" : arDataGnk.gnk_company_director_pinfl,
                    }
                    }, function(rqste) {
                        if(rqste.error()){
                            debugger;
                            resolve(rqste.error());
                        }else{     
                            BX24.callMethod("crm.address.add", {
                                    fields:{ 
                                        "TYPE_ID" : 6, // юр адресс
                                        "ENTITY_TYPE_ID" : 8, // реквизиты
                                        "ENTITY_ID" : rqste.data(), // id реквизита
                                        "ADDRESS_1" : arDataGnk.gnk_company_address,
                                    }        
                                }
                            );
                            BX24.callMethod("app.option.get",
                                {"option":"renameCompany"},
                                function(result){ 
                                if(result.error()){
                                    console.error(result.data());
                                }else{
                                    let companyName = result.data()==="false"?"":arDataGnk.gnk_company_name;
                                    let directorBio = arDataGnk.gnk_company_director_name.split(' '); 
                                    
                                    var dataToUpdate = {
                                        "TITLE":companyName,
                                    }
                                    dataToUpdate[fieldName] = inn;
                                    BX24.callMethod(`crm.${ENTITY}.update`, { 
                                            id: enitiyId,
                                            fields:dataToUpdate,
                                            params: { "REGISTER_SONET_EVENT": "Y" }				
                                        }, function(result) {
                                            if(result.error()){
                                                console.error(result.error());
                                            }else{
                                                resolve(result.data());
                                            }
                                        }
                                    );
                                }
                            })
                        }
                    }
                );
            }
        })
    }
    async companyRqAdd(obj,preset) {
        try {
            const dataAPI = await this.companyRqAddPromise(obj.data,preset,this.entityElemId,this.input.value, this.fieldName);
            return dataAPI;
        } catch (error) {
            console.error(error);
            // return error;
        }
    }

    async companyRqUpdatePromise(arDataGnk,preset,enitiyId,rqId,inn,fieldName=this.fieldName,ENTITY=this.entity){ // обновление карточки компании (PROMISE)
        return new Promise((resolve, reject) => {
            if(ENTITY=="company"){
                BX24.callMethod("crm.requisite.update", { // РЕКВИЗИТЫ
                    id:rqId,
                    fields:{ 
                        "ENTITY_TYPE_ID":4,
                        "ENTITY_ID":enitiyId,
                        "PRESET_ID":preset.ID,
                        "ACTIVE":"Y",	
                        "NAME" : preset.NAME,
                        "RQ_INN" : arDataGnk.company_tin,
                        "RQ_COMPANY_NAME": arDataGnk.gnk_company_name,
                        "RQ_COMPANY_FULL_NAME": arDataGnk.gnk_company_name_full,
                        "RQ_DIRECTOR": arDataGnk.gnk_company_director_name,
                        "RQ_ACCOUNTANT": arDataGnk.gnk_company_accountant,
                        "RQ_OKVED": arDataGnk.gnk_company_oked,
                        "RQ_PHONE": "",
                    }
                    }, function(rqste) {
                        if(rqste.error()){
                            console.error(rqste.error());
                        }else{
                            // BX24.callMethod("crm.address.update", {
                                //     fields:{ 
                                //         "TYPE_ID" : 6, // юр адресс
                                //         "ENTITY_TYPE_ID" : 8, // реквизиты
                                //         "ENTITY_ID" : rqId, // id реквизита
                                //         "ADDRESS_1" : arDataGnk.gnk_company_address,
                                //     }        
                                // }
                            // );
                            BX24.callMethod("crm.requisite.bankdetail.list", { // СПИСОК БАНКОВСКИХ РЕКВИЗИТОВ
                                    filter: { "ENTITY_ID": rqId}, // по id реквизита
                                    select: [ "ID", "NAME"]				
                                }, function(bank) {
                                    if(bank.error()){
                                        console.info(bank.error());
                                        resolve(bank.error());
                                    }else{
                                        BX24.callMethod("crm.requisite.bankdetail.update", { // БАНКОВСИЕ РЕКВИЗИТЫ
                                            id:bank.data()[0].ID, // id банка
                                            fields:{ 
                                                "COUNTRY_ID" : 1,
                                                "NAME" : "Первичный счёт",
                                                "RQ_BIK" : arDataGnk.gnk_company_mfo,
                                                "RQ_ACC_NUM" : arDataGnk.gnk_company_account,		
                                                "RQ_ACC_CURRENCY" : "Узбекский сум",			
                                            }
                                        }, function(rqBank) {
                                                if(rqBank.error()){
                                                    resolve(rqBank.error());
                                                }else{
                                                    BX24.callMethod("app.option.get", // ПРОВЕРЯЕМ УСТАНОВЛЕНА ЛИ ОПЦИЯ НА ПЕРЕЗАПИСЬ НАЗВАНИЯ КОМПАНИИ
                                                        {"option":"renameCompany"},
                                                        function(result){ 
                                                        if(result.error()){
                                                            resolve(result.data());
                                                        }else{
                                                            let companyName = result.data()==="false"?"":arDataGnk.gnk_company_name;
                                                            let directorBio = arDataGnk.gnk_company_director_name.split(' '); 
                                                            
                                                            var dynamicKey = fieldName; 
                                                            var dataToUpdate = {
                                                                "TITLE":companyName,
                                                                // "BANKING_DETAILS" : `` 
                                                            }
                                                            dataToUpdate[dynamicKey] = inn;

                                                            BX24.callMethod(`crm.${ENTITY}.update`, { // ОБНОВАЛЕНИЕ САМОЙ КОМПАНИИ
                                                                    id: enitiyId,
                                                                    fields:dataToUpdate,
                                                                    params: { "REGISTER_SONET_EVENT": "Y" }				
                                                                }, function(result) {
                                                                    if(result.error()){
                                                                        console.info(result.error());
                                                                        resolve(result.error());
                                                                    }else{
                                                                        resolve(result.data());
                                                                    }
                                                                }
                                                            );
                                                        }
                                                    })
                                                }
                                            }
                                        );		
                                    }
                                }
                            );
                        }
                    }
                );
            }else{
                var directorBio = arDataGnk.gnk_company_director_name.split(' '); 
                BX24.callMethod("crm.requisite.update", { // РЕКВИЗИТЫ
                    id:rqId,
                    fields:{ 
                        "ENTITY_TYPE_ID":3,
                        "ENTITY_ID":enitiyId,
                        "PRESET_ID":preset.ID,
                        "ACTIVE":"Y",	
                        "NAME" : preset.NAME,
                        "RQ_LAST_NAME": arDataGnk.gnk_company_director_name?directorBio[0]:"",//фамилия
                        "RQ_FIRST_NAME": arDataGnk.gnk_company_director_name?directorBio[1]:"",//имя
                        "RQ_SECOND_NAME": arDataGnk.gnk_company_director_name?directorBio[2]:"",//Отчество
                        "UF_CRM_RQ_PINFL" : arDataGnk.gnk_company_director_pinfl,
                    }
                    }, function(rqste) {
                        if(rqste.error()){
                            console.error(rqste.error());
                        }else{
                            let companyName = rqste.data()==="false"?"":arDataGnk.gnk_company_name;
                            var dataToUpdate = {};
                            dataToUpdate[fieldName] = inn;
                            BX24.callMethod(`crm.${ENTITY}.update`, { // ОБНОВЛЕНИЕ САМОЙ СУЩНОСТИ
                                    id: enitiyId,
                                    fields:dataToUpdate,
                                    params: { "REGISTER_SONET_EVENT": "Y" }				
                                }, function(result) {
                                    if(result.error()){
                                        console.log(result.error());
                                        resolve(result.error());
                                    }else{
                                        resolve(result.data());
                                    }
                                }
                            );
                        }
                    }
                );
            }
        })

    }
    async companyRqUpdate(obj,preset,enitiyId,rqId,inn) { // обновление карточки сущности
        try {
            const dataAPI = await this.companyRqUpdatePromise(obj.data,preset,enitiyId,rqId,inn);
            return dataAPI;
        } catch (error) {
            console.error(error);
            // return error;
        }
    }

    async getPresetPromise(presetName) {
        return new Promise((resolve, reject) => {
            BX24.callMethod("crm.requisite.preset.list", {
                    order: { "ID": "ASC" },
                    filter: { "NAME": presetName},
                    select: [ "ID", "NAME"]	
                },function(result) {
                    if(result.error()){
                        resolve(null);
                    }else{
                        resolve(result.data());
                    }
                }
            );
        });
    }
    async getPreset(presetName) {
        try {
            const presetId = await this.getPresetPromise(presetName);
            return presetId[0]; // возвращаем шаблон
        } catch (error) {
            console.error("ERROR: " + error);
            return error;
        }
    }

    setFieldValue(input,name){
        if(sessionStorage.entityInn){
            input.value = sessionStorage.entityInn;

            var dynamicKey = name; 
            var dataToUpdate = {};
            dataToUpdate[dynamicKey] = input.value;
            
            BX24.callMethod(`crm.${this.entity}.update`, {
                id: this.entityElemId,
                fields:dataToUpdate 
            }, function(result) {
                if(result.error()){
                    console.error(result.error());
                }else{
                    sessionStorage.removeItem("entityInn");
                }
            });
        }else{
            BX24.callMethod(`crm.${this.entity}.get`, 
            { id: this.entityElemId }, 
            function(result) {
                if(result.error()){
                    console.error(result.error());
                }else{
                    if(result.data()[name]){
                        input.value = result.data()[name];
                    }
                }
            });
        }
    }
    getAccesses(){
        BX24.callMethod("app.option.get",{},
            function(result){ 
            if(result.error()){
                console.error(result.data());
            }else{
                let params = result.data();
                if(!sessionStorage.token){
                    const client_id = '2';
                    const client_secret = 'wZ3rNvrzz2MnJYfI9an0W1Z7AaTgF2DwX5oP9G6z';
                    var myHeaders = new Headers();
                    myHeaders.append("Authorization", "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIyIiwianRpIjoiZjE4MjhhYWVhMTZkY2JjODEzMzI1NTljYjQ0MmY3YTRhYmVjNmY1ZDE3NTE4ODYwZmVmYjE4OWNhOWIwNDdhNzk2MDZkYWEyYzkwMzcyNmYiLCJpYXQiOjE2ODk1Njk5MzguMjE3NjQxLCJuYmYiOjE2ODk1Njk5MzguMjE3NjQ3LCJleHAiOjE2ODk2NTYzMzguMTg1NjI2LCJzdWIiOiI0OTBkOGEyZi1iZDhjLTQwY2EtYmNmNy02Y2FhMjBhOTJkMTAiLCJzY29wZXMiOlsiKiJdfQ.f504EQ3tS58BpLjLyTmp0CS_ZaTNWX6DWABajorCfjnxhRKLmfOcoRsTOYabtkRP6sI4n34viQ6rYGWnE_iRe9--2Kv7nAkUNXiMcmT-DOq2jQb-xYbWU0QhhrdYh9YstgoTZDn-R2hanvY8BmQ2nccHK8gqB7u295wlxsM8kAbiR4HhmchAUHS9kGW_wAkSD-H5Yt2ChAg3w0A1LImzF_QzVx90yqZgS_-C9LBsbfE3ovVWtZnKu-9V8bcV12XKF7GR9thR-MrMLeQwg-WVKHytXuiID_-o3WDQGyOB7qkXoR6SdsAptey04iVDSpSRK0678Je5_VB74ZrJVBePz9pIrh-AjbWYWmRksIc8y7QolcHU6sLpmXlq0bSvvTKJiZDggKckFAzJqZEWfHjw8LHbC7_JZINbvipDxs0Xoddi_hClO1ONTOMgI_rMbNxhPwkPuRZXBHvbmvMMeU3IGlv-O3iDvZEGmJgg_7Him6v2oWwE_hoxTsTp-zPt_Bys3i-QIGNg8YxKhu2Ic227n1GnCLNWPOY8IaaPy5HUVVdhgBFzowWWuIiFi_HkZ8Whxn7LWRXL_uve8MZ508EPddQZoqtFffRFJ9tD8tSn9gY9TvMg7A_bB8wbUG3OMcoCdu7B75Bth5nZ_q0CIDFbFtp9Meh2batndtf2RLYhcOY");

                    var formdata = new FormData();
                    formdata.append("client_id", client_id);
                    formdata.append("client_secret", client_secret);
                    formdata.append("username", params.login);
                    formdata.append("password", params.password);
                    formdata.append("scope", "");
                    formdata.append("grant_type", "password");

                    var requestOptions = {
                        method: 'POST',
                        headers: myHeaders,
                        body: formdata,
                        redirect: 'follow'
                    };

                    fetch("https://auth.multibank.uz/oauth/token", requestOptions)
                    .then(response => response.text())
                    .then(result => {sessionStorage.setItem("token",result);})
                    .catch(error => console.log('error', error));
                }
            }
        });
    }

    editSelectors(setClass,delClass,node){
        node.classList.remove(delClass);
        node.classList.add(setClass);
    }

    showMessge(messge){
        this.messgeElement.innerHTML=messge;
        this.inputParent.style.display="none";
        this.messgeParent.style.display="block";
    }

    cleanSpaces(e){
        // e.preventDefault();
        // var pastedText = '';
        // if (window.clipboardData && window.clipboardData.getData) {
        //     pastedText = window.clipboardData.getData('Text');
        // } else if (e.clipboardData && e.clipboardData.getData) {
        //     pastedText = e.clipboardData.getData('text/plain');
        // }
        // this.value = pastedText.replace(/\s/g, '');
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
        // Проверьте, что ИНН состоит из 10 или 12 цифр (в зависимости от страны) и соответствует формату
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
        if(action == "create"){;
            this.infoTag.textContent = "новый";
            this.setFieldStatus("success",this.inputParent,this.infoTag,this.btnLink);
            this.btnLink.removeAttribute('disabled');
        }else if(action == "default"){
            this.infoTag.textContent = "Введите 9 цифр";
            this.inputParent.classList.remove(`ui-ctl-primary`);
            this.setFieldStatus("primary",this.inputParent,this.infoTag,this.btnLink);
            this.btnLink.setAttribute('disabled',true);
        }else if(action == "update"){
            this.infoTag.textContent = "Обновление данных";
            this.setFieldStatus("success",this.inputParent,this.infoTag,this.btnLink);
            this.btnLink.removeAttribute('disabled');
        }else if(action == "createAll"){
            this.infoTag.textContent = text?text:"Реквизиты уже заполнены. Будет создана новая компания.";
            this.setFieldStatus("success",this.inputParent,this.infoTag,this.btnLink);
            this.btnLink.removeAttribute('disabled');
        }else if(action == "link"){
            this.infoTag.textContent = text?text:"Данная компания уже существует";
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
            this.infoTag.textContent = "ИНН не найден";
            this.setFieldStatus("warning",this.inputParent,this.infoTag,this.btnLink);
        }else{
            this.infoTag.textContent = text?text:"Заполнение будет доступно после сохранения компании";
            this.setFieldStatus("primary",this.inputParent,this.infoTag,this.btnLink);
            this.btnLink.setAttribute('disabled',true);
        }
    } 
}