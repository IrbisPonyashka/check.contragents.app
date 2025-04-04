export default class clientHandler {
    /* класс который выполняет ряд функций такие как, поиск реквизитов по ИНН, создание компании с заполненными реквизитами, создание реквизита для компании и обновление реквизитов */
    constructor(entityId,entityElemId,fieldName,domain,inputElement,inputParent,tag,clear,loader,btnElement) {
        // this.appOptionPanel = document.querySelector("#app-settings");
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

        this.messgeParent = document.querySelector("#success");
        this.messgeElement = document.querySelector("#success .ui-alert");

        this.btnLink.textContent = "Создать";
        this.requisite = null;
        this.method = null;
        this.type = null;
        
        this.valueLength = null;
        this.valueLength = "14"; // Вставляеться в название метода при вызове( crm.company.add./crm.contact.add и тд)
        this.entity = entityId=="CRM_CONTACT"?"contact":"company"; // Вставляеться в название метода при вызове( crm.company.add./crm.contact.add и тд)
        this.type = entityId=="CRM_CONTACT"?"individual":"entity"; // Вставляеться в название метода при вызове( crm.company.add./crm.contact.add и тд)

        this.entityObject = null;
        this.input.setAttribute("maxlength",this.valueLength);
        this.input.addEventListener("input", (event) => this.processInput(event.target)); 

        
        /*
        this.btnMergeContainer = btnElement.parentElement.cloneNode(true);
        this.btnMerge=this.btnMergeContainer.querySelector("button");
        this.btnMerge.classList.add("ui-btn-icon-merger");
        this.btnMerge.title = this.entity=="company"?"Слияние данной компании с обнаруженным дубликатом":"Слияние данного контакта с обнаруженным дубликатом";
        */

        // this.btnDeleteContainer = btnElement.parentElement.cloneNode(true);
        // this.btnDelete=this.btnDeleteContainer.querySelector("button");
        // this.btnDelete.classList.add("ui-btn-icon-remove");
        // this.btnDelete.title = this.btnDelete.title = this.entity=="company"?"Удалить данную компанию и перейти к найденной":"Удалить данный контакт и перейти к найденному";
        
        this.renameCompanyTitle=true;
        this.renameContactTitle=true;
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
                        this.entityPreset =     await this.getPreset({order: { "ID": "ASC" },filter: { "ID": appOption.data().params.EntityPresetId },select: [ "ID", "NAME"]	});
                        this.individualPreset = await this.getPreset({order: { "ID": "ASC" },filter: { "ID": appOption.data().params.IndividaulPresetId },select: [ "ID", "NAME"]	});
                    }
                }
            }
        );
        
        this.btnClear.addEventListener('click', (event) => this.clearInput()); //очистка поля
        this.getAccesses(); // сохранение токена авторизации в SessionStorage
        
        if(this.entityElemId!=0){
            this.setFieldValue(this.input,this.fieldName); // запись значения в поле сущности, в аргумент передается названия поля
        }

        this.input.addEventListener("input", (event) => this.processInput(event.target)); 
        this.btnLink.addEventListener('click', (event) => this.actionChange());  
        // this.btnDelete.addEventListener('click', (event) => this.deleteEntity(event)); 
        /* this.btnMerge.addEventListener('click', (event) => this.mergeEntity(event)); */  
        
        // this.input.addEventListener('keyup', function(event) { event.target.value = this.value.replace(' ', '') }); // очистка от пробелов при вводе
        this.btnClear.addEventListener('click', (event) => this.clearInput()); //очистка поля

        setTimeout(() => { 
            if(this.input.value!=""){
                this.input.value = this.input.value.trim().replace(' ', '').replace(' ','');
                this.processInput(this.input);
            }
        }, "1000");
    }

    async processInput(target)
    {
        const inn = target.value.trim().replace(' ', '').replace(' ','');
        this.btnClear.style.display = inn.length>0?"block":"none";

        // if(this.btnDeleteContainer.parentElement!=null)
        // {
        //     this.inputParent.removeChild(this.btnDeleteContainer);
        //     this.btnDelete.setAttribute("disabled",true);
        // }

        /* if(this.btnMergeContainer.parentElement!=null)
        {
            this.inputParent.removeChild(this.btnMergeContainer);
            this.btnMerge.setAttribute("disabled",true);
        } */

        if (!this.isValidInn(inn)) {
            this.setStatusToAction("invalid");
            return;
        }

        /* this.entityElemId = 0, в карточке создания элемента */ 
        if(this.entityElemId == 0) 
        {
            this.setStatusToAction();
            if( (inn.length == 9 || inn.length == 14) && this.isValidInn(inn) ){
                
                BX24.placement.call('setValue', inn);
                sessionStorage.setItem("entityInn",inn);

            }else if(inn.length >= 1 && inn.length <= this.valueLength ){

                this.setStatusToAction("invalid","Введите 9 цифр");
            
            }else{
            
                this.setStatusToAction("default");
            
            }
        }
        else
        {
            if(
                (this.type=="entity" && (inn.length == this.valueLength || inn.length == 9) ) ||
                (this.type=="individual" && inn.length == this.valueLength || inn.length == 9) || 
                (this.entity=="contact" && inn.length == 14) || 
                (this.entity=="company" && this.type==null && (inn.length==14 || inn.length==9))
                && this.isValidInn(inn)
            ){
                this.setLoading(true);
                this.setStatusToAction("default","поиск...");

                this.setValueToStorageField(inn,this.fieldName);

                const rqLinked =         await this.hasThisRq(inn);
                
                const dataApi =          await this.getDataAPIbyInn(inn);

                if(dataApi!=null && isNaN(dataApi))
                {
                    const gnkCompanyTin = dataApi.data.company_tin ?? null;
                    const gnkCompanyPinfl = dataApi.data.gnk_company_director_pinfl ?? null;

                    const companyIdWithInn = await this.hasCompanyWithInn(gnkCompanyTin, this.entityElemId);

                    // console.log(gnkCompanyTin, "gnkCompanyTin");
                    // console.log(gnkCompanyPinfl, "gnkCompanyPinfl");
                    
                    // console.log(companyIdWithInn, "companyIdWithInn");

                    // console.log(dataApi, "dataApi");
                    // console.log(rqLinked, "rqLinked");

                    // if(gnkCompanyTin === rqLinked[0].RQ_INN || gnkCompanyPinfl === rqLinked[0].RQ_INN){
                    //     console.log("ОБНОВЛЕННИЕ А НЕ СОЗДАНИЕ");
                    // }
                    
                    if(companyIdWithInn == false) { // создание 
                        
                        if(gnkCompanyPinfl){
                            const companyIdWithPinfl = await this.hasCompanyWithInn(gnkCompanyPinfl, this.entityElemId);
                            if(companyIdWithPinfl)
                            {
                                this.btnLink.textContent = this.entity=="contact" ? "Перейти в контакт" : "Перейти в компанию";
                                this.setStatusToAction("link",`найдено дубликатов: ${companyIdWithPinfl.length}`);
                                this.setLoading(false);
                                return;
                            }
                        }

                        if(rqLinked != false) { // создаем компанию с реквизитами 
                            this.btnLink.textContent = this.entity=="contact" ? "Создать контакт" : "Создать компанию";
                            this.setStatusToAction("createAll");
                        } else { // создаем 
                            this.btnLink.textContent = "Создать";
                            this.setStatusToAction("create");
                        }
                    }
                    else if(Array.isArray(companyIdWithInn) == false)
                    {
                        this.requisite = companyIdWithInn.ID;
                        this.btnLink.textContent = this.entity=="contact" ? "Обновить контакт" : "Обновить компанию";
                        this.setStatusToAction("update");
                        
                    }else{ 
                        // перенапрвляем или удаляем (на выбор пользователю)
                        
                        // this.btnDelete = deleteBtnContainer.querySelector("button");
                        /* this.editSelectors("ui-btn-primary","ui-btn-disabled",this.btnMerge);
                        this.editSelectors("ui-btn-primary","ui-btn-primary",this.btnMerge);
                        this.btnMerge.removeAttribute("disabled"); */

                        // this.editSelectors("ui-btn-danger","ui-btn-disabled",this.btnDelete);
                        // this.editSelectors("ui-btn-danger","ui-btn-primary",this.btnDelete);
                        // this.btnDelete.removeAttribute("disabled");
                        
                        /* this.inputParent.appendChild(this.btnMergeContainer);
                        this.btnMerge.textContent = ""; */
                        // this.inputParent.appendChild(this.btnDeleteContainer);
                        // this.btnDelete.textContent = "";

                        this.btnLink.textContent = this.entity=="contact" ? "Перейти в контакт" : "Перейти в компанию";

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
            }else if(
                (this.type=="entity" && target.value.length>=1&&target.value.length<=9)||
                (this.type=="individual" && target.value.length>=1&&target.value.length<=14) ||
                (target.value.length>=1&&target.value.length<=this.valueLength)){
                    if(this.entity == "contact"){
                        this.setStatusToAction("invalid",`Введите 14 цифр`);
                    }else{
                        this.setStatusToAction("invalid", this.type!=null ? `Введите ${this.valueLength} цифр` : "Введите 9 цифр для ИНН или 14 цифр для ПИНФЛ");
                    }
            }else{
                this.setStatusToAction("default");
            }
        }

    }

    async actionChange()
    {
        // только при изменении в карточки, 4 действия : Создание, Обновление, Перейти к элементу сущности, Создать элемент сущности 

        this.setLoading(true);
        const inn = this.input.value.trim().replace(' ', '').replace(' ','');;
        const dataApi = await this.getDataAPIbyInn(inn);
        var presetFilter = {
            order: { "ID": "ASC" },
            filter: {},
            select: [ "ID", "NAME"]	
        }
        var presetRq = [];
        if(this.type!=null){
            presetRq = this.type == "entity" ? this.entityPreset : this.individualPreset;
        }else{
            presetRq = inn.length == 9 ? this.entityPreset : this.individualPreset;
        }
        
        // console.log(this.entityPreset,this.individualPreset);

            if(this.method=="create"){

                const createdRQ = await this.companyRqAdd(dataApi.data,presetRq[0],this.entityElemId,inn, this.fieldName);
                if(createdRQ){
                    // BX24.placement.call('setValue', inn);
                    // window.location.reload();
                    // window.top.location.href=`https://${this.domain}/crm/${this.entity}/details/${this.entityElemId}/`;
                }
            }else if(this.method=="createAll"){

                const createdCompanyWithRQ = await this.createCompanyWithRq(dataApi.data,presetRq[0],this.fieldName,inn);
                
                if(createdCompanyWithRQ){
                    this.setStatusToAction("link",`${this.entity=="contact" ? "Контакт создан и заполнен" : "Компания создана и заполнена" }`);
                    this.btnLink.textContent = this.entity=="contact" ? "Перейти в контакт" :  "Перейти в компанию";
                    let link = document.createElement("a");
                    link.style.display = "none";
                    link.target = "_blank";
                    link.href = `https://${this.domain}/crm/${this.entity}/details/${createdCompanyWithRQ}/`;
                    document.querySelector("#check__btn-container").appendChild(link);
                    link.click();
                }
            }else if(this.method=="update" && this.requisite!=null){

                const updateRQ = await this.companyRqUpdate(dataApi.data,presetRq[0],this.entityElemId,this.requisite,inn);
                if(updateRQ){
                    // BX24.placement.call('setValue', inn);
                    // window.location.reload();
                    // window.top.location.href=`https://${this.domain}/crm/${this.entity}/details/${this.entityElemId}/`;
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
    }

    async deleteEntity(event, ENTITY = this.entity)
    {
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
                    BX24.placement.call('setValue', inn);
                    window.location.reload();
                    // window.top.location.href=`https://${domain}/crm/${ENTITY}/details/${entityID}/`;
                }
            }
        );
    }

    async mergeEntity(event, ENTITY = this.entity)
    {
        const domain = this.domain;
        const inn = this.input.value.trim().replace(' ', '').replace(' ','');
        const entityID = this.entityElemId;
        const companyIdWithInn = await this.hasCompanyWithInn(inn,entityID);
        let mergeArray = companyIdWithInn.map((obj) => {return obj.ENTITY_ID});
        mergeArray.push(entityID);

        BX24.callMethod(`crm.entity.mergeBatch`, 
            {
                params: {
                    entityTypeId: this.entity=="contact"?3:4,
                    entityIds: mergeArray,
                }
            }, 
            function(result) {
                if(result.error()){
                    console.log(result);
                }else{
                    let link = document.createElement("a");
                    link.style.display="none";
                    link.target="_blank";
                    if(result.data().STATUS=="CONFLICT"){
                        link.href=`https://${domain}/crm/${ENTITY}/merge/?id=${mergeArray.toString()}`;
                        document.querySelector("#check__btn-container").appendChild(link);
                        link.click();
                    }else if(result.data().STATUS=="SUCCESS"){
                        BX24.placement.call('setValue', inn);
                        window.location.reload();
                        // window.top.location.href=`https://${domain}/crm/${ENTITY}/details/${entityID}/`;
                    }
                }
            }
        );
    }

    async getDataAPIbyInn(inn)
    {
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

            // console.log("result",result);
            // Обработка ошибок авторизации
            if (result.message === "Unauthorized") {
                sessionStorage.removeItem("token");
                await this.getAccesses();
                return this.getDataAPIbyInn(inn); // Повторный вызов функции
            } else if (result.success) {
                console.warn('Token is invalid or expired. Attempting to refresh...');
                return result;
            } else {
                console.warn('API returned an error:', result);
                return result.code;
            }

            // // return fetch(`https://api.multibank.uz/api/check_contragent/v1/general/${inn}?refresh=0`, requestOptions)
            // return fetch(`https://api.multibank.uz/api/check_contragent/v1/gnk/${inn}?refresh=1`, requestOptions)
            //     .then(response => response.text())
            //     .then(result => {
            //         if(JSON.parse(result).message == "Unauthorized"){
            //             // повтор функции
            //             // this.getAccesses(); - обновление session storage
            //         }else{
            //             if(JSON.parse(result).success){
            //                 return JSON.parse(result);
            //             }else{
            //                 return JSON.parse(result).code;
            //             }
            //         }
            //     })
            // .catch(error => console.log('error', error));

        } catch (error) {
            console.log(error);
        }
    }

    async hasCompanyWithInn(inn,entityId,ENTITY=this.entity)
    {
        return new Promise((resolve, reject) => {
            var filterObj = {};
            if(ENTITY=="company"){
                filterObj.RQ_INN = inn;
                filterObj.ENTITY_TYPE_ID = 4;
            }else{
                filterObj.RQ_INN = inn;
                filterObj.ENTITY_TYPE_ID = 3;
            }
            BX24.callMethod("crm.requisite.list",{
                filter: filterObj,
                select: [ "ID", "NAME","RQ_COMPANY_NAME","ENTITY_ID", "RQ_INN"]
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

    async hasThisRq()
    {
        return new Promise((resolve, reject) => {
            BX24.callMethod("crm.requisite.list",{
                filter: {
                    "ENTITY_ID": this.entityElemId,
                    "ENTITY_TYPE_ID": this.entity == "contact" ? 3 : 4
                },
                select: [ "ID", "NAME","RQ_COMPANY_NAME", "RQ_INN", "ENTITY_ID"]
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

    async createCompanyWithRq(arDataGnk ,preset, fieldName, inn, ENTITY = this.entity)
    { 
        // создание компании с реквизитами (PROMISE)

        return new Promise((resolve, reject) => {
            var dataToUpdate = {}
            const directorBio = arDataGnk.gnk_company_director_name ? arDataGnk.gnk_company_director_name.split(' ') : false ; 
            if(ENTITY=="company"){
                dataToUpdate.TITLE = arDataGnk.gnk_company_name;
            }else if(ENTITY=="contact"){
                dataToUpdate.LAST_NAME = directorBio ? directorBio[0] : "";
                dataToUpdate.NAME = directorBio ? directorBio[1] : "";
                dataToUpdate.SECOND_NAME = directorBio ? directorBio[2] : "";
            }

            dataToUpdate.UF_CRM_1732280688058 = ""; // Банковские реквизиты
            dataToUpdate.UF_CRM_1730706873638 = ""; // Название банка
            dataToUpdate.UF_CRM_1732280758867 = arDataGnk.gnk_status_name; // Банковские реквизиты
            dataToUpdate.UF_CRM_1730706901979 = arDataGnk.gnk_company_address; // Юр. адрес компании
            dataToUpdate.UF_CRM_1730706882227 = arDataGnk.gnk_company_account; // Расчетный счет в банке
            dataToUpdate.UF_CRM_1730706896133 = arDataGnk.gnk_company_mfo; // МФО
            dataToUpdate.UF_CRM_1730706889624 = arDataGnk.gnk_company_oked; // ОКЭД
            dataToUpdate.UF_CRM_1732280703903 = directorBio ? directorBio[0]: ""; // Фамилия директора
            dataToUpdate.UF_CRM_1732280711686 = directorBio ? directorBio[1]: ""; // Имя директора
            dataToUpdate.UF_CRM_1730706908545 = arDataGnk.gnk_company_director_name ?? ""; // Статус плательщика НДС

            dataToUpdate[fieldName] = inn;
            BX24.callMethod(`crm.${this.entity}.add`, {
                    fields:dataToUpdate,
                    params: { "REGISTER_SONET_EVENT": "Y" }		
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
                                        "ENTITY_TYPE_ID":ENTITY=="contact"?3:4,
                                        "ENTITY_ID":entity.data(),
                                        "PRESET_ID":preset.ID,
                                        "ACTIVE":"Y",	
                                        "NAME" : preset.NAME,
                                        "RQ_INN" : arDataGnk.company_tin ?? arDataGnk.gnk_company_director_pinfl,
                                        "UF_CRM_RQ_PINFL" : arDataGnk.company_tin ?? arDataGnk.gnk_company_director_pinfl,
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

    async companyRqAdd(arDataGnk,preset,enitiyId,inn,fieldName,ENTITY=this.entity)
    {
        return new Promise((resolve, reject) => {
            let directorBio = arDataGnk.gnk_company_director_name.split(' ');  
            BX24.callBatch({
                crmRequisiteAdd: {
                    method:'crm.requisite.add',
                    params: {
                        fields:{ 
                            "ENTITY_TYPE_ID":ENTITY=="contact"?3:4,
                            "ENTITY_ID":this.entityElemId,
                            "PRESET_ID":preset.ID,
                            "ACTIVE":"Y",	
                            "NAME" : preset.NAME,
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
                var dynamicKey = fieldName; 
                var dataToUpdate = {}
                
                if(ENTITY=="company" && this.renameCompanyTitle){
                    dataToUpdate.TITLE = arDataGnk.gnk_company_name;
                }else if(ENTITY=="contact" && this.renameContactTitle){
                    dataToUpdate.LAST_NAME = directorBio ? directorBio[0] : "";
                    dataToUpdate.NAME = directorBio ? directorBio[1] : "";
                    dataToUpdate.SECOND_NAME = directorBio ? directorBio[2] : "";
                }

                dataToUpdate.UF_CRM_1732280688058 = ""; // Банковские реквизиты
                dataToUpdate.UF_CRM_1730706873638 = ""; // Название банка
                dataToUpdate.UF_CRM_1732280758867 = arDataGnk.gnk_status_name; // Банковские реквизиты
                dataToUpdate.UF_CRM_1730706901979 = arDataGnk.gnk_company_address; // Юр. адрес компании
                dataToUpdate.UF_CRM_1730706882227 = arDataGnk.gnk_company_account; // Расчетный счет в банке
                dataToUpdate.UF_CRM_1730706896133 = arDataGnk.gnk_company_mfo; // МФО
                dataToUpdate.UF_CRM_1730706889624 = arDataGnk.gnk_company_oked; // ОКЭД
                dataToUpdate.UF_CRM_1732280703903 = directorBio ? directorBio[0]: ""; // Фамилия директора
                dataToUpdate.UF_CRM_1732280711686 = directorBio ? directorBio[1]: ""; // Имя директора
                dataToUpdate.UF_CRM_1730706908545 = arDataGnk.gnk_company_director_name ?? ""; // Статус плательщика НДС

                dataToUpdate[dynamicKey] = inn;
                BX24.callMethod(`crm.${ENTITY}.update`, { // ОБНОВЛЕНИЕ САМОЙ КОМПАНИИ
                        id: enitiyId,
                        fields:dataToUpdate,
                        params: { "REGISTER_SONET_EVENT": "N" }				
                    }, function(result) {
                        if(result.error()){
                            console.info(result.error());
                            resolve(result.error());
                        }else{
                            resolve(result.data());
                        }
                    }
                );
            });
        })
    }

    async companyRqUpdate(arDataGnk,preset,enitiyId,rqId,inn,fieldName=this.fieldName,ENTITY=this.entity)
    { // обновление карточки компании (PROMISE)
        return new Promise((resolve, reject) => {
            const directorBio = arDataGnk.gnk_company_director_name ? arDataGnk.gnk_company_director_name.split(' ') : false ; 
            BX24.callBatch({
                crmRequisiteUpdate: {
                    method:'crm.requisite.update',
                    params: {
                        id:rqId,
                        fields:{ 
                            "ENTITY_TYPE_ID":ENTITY=="contact"?3:4,
                            "ENTITY_ID":this.entityElemId,
                            "PRESET_ID":preset.ID,
                            "ACTIVE":"Y",	
                            "NAME" : preset.NAME,
                            "RQ_INN" : ENTITY=="contact"?arDataGnk.gnk_company_director_pinfl:arDataGnk.company_tin,
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
                /* crmAddressUpdate: {
                    method: 'crm.address.update',
                    params: {
                        fields:{ 
                            "TYPE_ID" : 6, // юр адресс
                            "ENTITY_TYPE_ID" : 8, // реквизиты
                            "ENTITY_ID" : rqId, // id реквизита
                            "ADDRESS_1" : arDataGnk.gnk_company_address,
                        }
                    }
                }, */
                crmBankdetailList: {
                    method: 'crm.requisite.bankdetail.list',
                    params: {
                        filter: { "ENTITY_ID": rqId}, // по id реквизита
                        select: [ "ID", "NAME","ENTITY_ID"]				
                    }
                },
                crmBankdetailUpdate: {
                    method: 'crm.requisite.bankdetail.update',
                    params: {
                        id:"$result[crmBankdetailList][0][ID]",
                        fields:{ 
                            "ENTITY_ID" : rqId, // id реквизита
                            "COUNTRY_ID" : 1,
                            "NAME" : "Первичный счёт",
                            "RQ_BIK" : arDataGnk.gnk_company_mfo,
                            "RQ_ACC_NUM" : arDataGnk.gnk_company_account,		
                            "RQ_ACC_CURRENCY" : "Узбекский сум",
                        }
                    }
                }
            },(result) => {

                var dynamicKey = fieldName; 
                var dataToUpdate = {}
                if(ENTITY=="company" && this.renameCompanyTitle){
                    dataToUpdate.TITLE = arDataGnk.gnk_company_name;
                }else if(ENTITY=="contact" && this.renameContactTitle){
                    dataToUpdate.NAME = directorBio ? directorBio[0] : "";
                    dataToUpdate.LAST_NAME = directorBio ? directorBio[1] : "";
                    dataToUpdate.SECOND_NAME = directorBio ? directorBio[2] : "";
                }

                dataToUpdate.UF_CRM_1732280688058 = ""; // Банковские реквизиты
                dataToUpdate.UF_CRM_1730706873638 = ""; // Название банка
                dataToUpdate.UF_CRM_1732280758867 = arDataGnk.gnk_status_name; // Банковские реквизиты
                dataToUpdate.UF_CRM_1730706901979 = arDataGnk.gnk_company_address; // Юр. адрес компании
                dataToUpdate.UF_CRM_1730706882227 = arDataGnk.gnk_company_account; // Расчетный счет в банке
                dataToUpdate.UF_CRM_1730706896133 = arDataGnk.gnk_company_mfo; // МФО
                dataToUpdate.UF_CRM_1730706889624 = arDataGnk.gnk_company_oked; // ОКЭД
                dataToUpdate.UF_CRM_1732280703903 = directorBio ? directorBio[0]: ""; // Фамилия директора
                dataToUpdate.UF_CRM_1732280711686 = directorBio ? directorBio[1]: ""; // Имя директора
                dataToUpdate.UF_CRM_1730706908545 = arDataGnk.gnk_company_director_name ?? ""; // Статус плательщика НДС

                dataToUpdate[dynamicKey] = inn;
                BX24.callMethod(`crm.${ENTITY}.update`, { // ОБНОВЛЕНИЕ САМОЙ КОМПАНИИ
                        id: enitiyId,
                        fields:dataToUpdate,
                        params: { "REGISTER_SONET_EVENT": "N" }				
                    }, function(result) {
                        if(result.error()){
                            console.info(result.error());
                            resolve(result.error());
                        }else{
                            resolve(result.data());
                        }
                    }
                );
            });

        })

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

    setFieldValue(input,name)
    {
        // console.log(input,name);
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
            (result) => {
                if(result.error()){
                    console.error(result.error());
                }else{
                    this.entityObject = result.data();

                    // console.log(result.data()[name]);
                    if(result.data()[name]){
                        input.value = result.data()[name];
                    }else{
                        BX24.callMethod(`crm.requisite.list`, 
                        {
                            filter: { "ENTITY_ID": this.entityElemId},
                        }, 
                        (result) => {
                            // console.log(result);
                            if(result.error()){
                                console.error(result.error());
                            }else{
                                if(result.data().length>0){
                                    input.value = result.data()[0]["RQ_INN"];
                                }

                            }
                        });

                    }
                }
            });
        }
    }

    setValueToStorageField(inn,name = this.fieldName){
        var dataToUpdate = {};
        dataToUpdate[name] = inn;

        BX24.placement.call('setValue', inn);

        BX24.callMethod(`crm.${this.entity}.update`, {
            id: this.entityElemId,
            fields:dataToUpdate
        }, (result) => {  });
    }

    async getAccesses()
    {
        return new Promise((resolve, reject) => {
            BX24.callMethod("app.option.get",{},
                (result) => { 
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
                        formdata.append("grant_type", "password");
                        formdata.append("client_id", client_id);
                        formdata.append("client_secret", client_secret);
                        formdata.append("scope", "");
                        formdata.append("username", params.login);
                        formdata.append("password", params.password);
    
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
                    }else{
                        resolve(true);
                    }
                }
            });
        })
    }

    editSelectors(setClass,delClass,node)
    {
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

    setStatusToAction(action,text)
    {
        this.method=action;
        if(action == "create"){;
            this.infoTag.textContent = "новый";
            this.setFieldStatus("success",this.inputParent,this.infoTag,this.btnLink);
            this.btnLink.removeAttribute('disabled');
        }else if(action == "default"){
            this.infoTag.textContent = `Введите ${this.entity=="contact" ? "14" : "9"} цифр`;
            this.inputParent.classList.remove(`ui-ctl-primary`);
            this.setFieldStatus("primary",this.inputParent,this.infoTag,this.btnLink);
            this.btnLink.setAttribute('disabled',true);
        }else if(action == "update"){
            this.infoTag.textContent = "Обновление данных";
            this.setFieldStatus("success",this.inputParent,this.infoTag,this.btnLink);
            this.btnLink.removeAttribute('disabled');
        }else if(action == "createAll"){
            this.infoTag.textContent = text?text:`Реквизиты уже заполнены. ${this.entity=="contact" ? "Будет создан новый контакт." : "Будет создана новая компания."}`;
            this.setFieldStatus("success",this.inputParent,this.infoTag,this.btnLink);
            this.btnLink.removeAttribute('disabled');
        }else if(action == "link"){
            this.infoTag.textContent = text?text:`${this.entity=="contact" ? "Данный контакт уже существует" : "Данная компания уже существует"}`;
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
            this.infoTag.textContent = text?text:`Заполнение будет доступно после сохранения ${this.entity=="contact" ? "контакта" : "компании"}`;
            this.setFieldStatus("primary",this.inputParent,this.infoTag,this.btnLink);
            this.btnLink.setAttribute('disabled',true);
        }
    } 
}
