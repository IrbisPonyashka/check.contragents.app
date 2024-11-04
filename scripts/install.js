
document.querySelector(".alert__close").addEventListener('click', (e) => {
    document.querySelector("[role='alert'].alert__block").style.display="none";
})
document.querySelector("[data-pass].password-input span").addEventListener('click', (e) => {
    if(e.target.classList.value == 'icon-eye-c'){
        e.target.classList.remove("icon-eye-c");
        e.target.classList.add("icon-eye");
        document.querySelector("#auth_password").type = "password";
    }else{
        e.target.classList.add("icon-eye-c");
        e.target.classList.remove("icon-eye");
        document.querySelector("#auth_password").type = "string";
    }
})
    const url = "https://micros.uz/it/solutions_our/multicheck.app/app/ajax.php";
    // AUTH
    $('#submit_btn').click(function(e){
        e.preventDefault();
        var data = {"login":$('#auth_login').val(),"password":$('#auth_password').val()};
            $.ajax({
            url: url,
            data: data,
            type: "POST",
            dataType: 'JSON',
            success: function(response){
            $('#requestLoader').hide();
                if(response['success']){
                    $('#form_login').hide();
                    document.querySelector("#form_login").style.display="none";
                    document.querySelector("[role='alert'].alert__block").style.display="none";
                    document.querySelector(".other_methods").style.display="none";
                    document.querySelector("#form_install").style.display="block";
                    document.querySelector(".login_form__title").innerHTML="Авторизация прошла успешно!";
                    document.querySelector(".login_form__title").style.textAlign="center";
                    // Сохранение логина,пароля и токена авторизации    
                    BX24.callMethod("app.option.set",{
                        "options":{
                            "login"   :$('#auth_login').val(),
                            "password":$('#auth_password').val(),
                            "renameCompany" : "true",              
                        }
                        },function(result){
                            if(result.error()){
                                alert("Описание ошибки: "+result.error());
                                // console.error(result.error());
                            }
                    });
                }else{
                    document.querySelector("[role='alert'].alert__block").style.display="block";
                }
            }
        });
        $('#requestLoader').hide();
    });

    // INSTALL APP
    $('#install_btn').click(function(e){
        e.preventDefault();
        $('#installRequestLoader').show();  
            BX24.init(async function(){                                 
                // Установка слушателей
                /* слушатель при Создании карточки контакта */ 
                BX24.callBind ("onCrmContactAdd","https://micros.uz/it/solutions_our/multicheck.app/app/field.type.handler.php",function(result){
                    if(result.error()){
                        alert("Описание ошибки: "+result.error());
                        console.error(result.error());
                    }
                });

                /* слушатель при Создании карточки компании */ 
                BX24.callBind ("onCrmCompanyAdd","https://micros.uz/it/solutions_our/multicheck.app/app/field.type.handler.php",function(result){
                    if(result.error()){
                        alert("Описание ошибки: "+result.error());
                        console.error(result.error());
                    }
                });
            
                let handlerUrl = `https://micros.uz/it/solutions_our/multicheck.app/app/field.type.handler.php`;
                let type = 'crm_cpv_type';
                let companyField = 'APP_CPV_FIELD';

                
                /* Перебираем пользовательские типы */
                    BX24.callMethod('userfieldtype.list', {}, 
                        function(result){
                            /* если уже создан тип, то обновляем его */
                            if(result.data().some(obj => obj.USER_TYPE_ID === "crm_inn")==true){     
                                BX24.callMethod('userfieldtype.update', 
                                    {
                                        USER_TYPE_ID: type,
                                        HANDLER : handlerUrl,
                                        TITLE: 'multicheck.app.Проверка контрагентов',
                                        DESCRIPTION: 'Пользовательский тип модуля «multicheck.app.Проверка контрагентов»',
                                        OPTIONS: {height:48}
                                    }, 
                                    function(result) 
                                    {
                                        if(result.error())
                                            console.error(result.error());
                                        else{
                                            BX24.callMethod("crm.company.userfield.add", { // поле для компании
                                                fields: {
                                                    "FIELD_NAME": companyField,
                                                    "VALUE": "000",
                                                    "EDIT_FORM_LABEL": "ИНН (Узбекистан)",
                                                    "LIST_COLUMN_LABEL": "Системное поле модуля",
                                                    "USER_TYPE_ID": type,
                                                    'SHOW_IN_LIST' : 'Y',
                                                    "XML_ID": companyField,
                                                    "SETTINGS": { "DEFAULT_VALUE": "Системное поле модуля" }
                                                }
                                            }, function(result) {
                                                if(result.error())
                                                console.error(result.error());
                                                else
                                                    console.dir(result.data());
                                            });
                                            BX24.callMethod("crm.deal.userfield.add", { // поле для сделки
                                                fields: {
                                                    "FIELD_NAME": companyField,
                                                    "VALUE": "000",
                                                    "EDIT_FORM_LABEL": "ИНН (Узбекистан)",
                                                    "LIST_COLUMN_LABEL": "Системное поле модуля",
                                                    "USER_TYPE_ID": type,
                                                    'SHOW_IN_LIST' : 'Y',
                                                    "XML_ID": companyField,
                                                    "SETTINGS": { "DEFAULT_VALUE": "Системное поле модуля" }
                                                }
                                            }, function(result) {
                                                if(result.error())
                                                console.error(result.error());
                                                else
                                                    console.dir(result.data());
                                            });
                                            BX24.callMethod("crm.contact.userfield.add", { // поле для контактов
                                                fields: {
                                                    "FIELD_NAME": companyField,
                                                    "VALUE": "000",
                                                    "EDIT_FORM_LABEL": "ИНН (Узбекистан)",
                                                    "LIST_COLUMN_LABEL": "Системное поле модуля",
                                                    "USER_TYPE_ID": type,
                                                    'SHOW_IN_LIST' : 'Y',
                                                    "XML_ID": companyField,
                                                    "SETTINGS": { "DEFAULT_VALUE": "Системное поле модуля" }
                                                }
                                            }, function(result) {
                                                if(result.error())
                                                console.error(result.error());
                                                else
                                                    console.dir(result.data());
                                            });
                                        }
                                    }
                                );
                            /* в другом случае создаем новый тип */
                            }else{
                                BX24.callMethod('userfieldtype.add', 
                                    {
                                        USER_TYPE_ID: type,
                                        HANDLER : handlerUrl,
                                        TITLE: 'multicheck.app.Проверка контрагентов',
                                        DESCRIPTION: 'Пользовательский тип модуля «Проверка контрагента»',
                                        OPTIONS: {height:48}
                                    }, 
                                    function(result) 
                                    {
                                        if(result.error())
                                            console.error(result.error());
                                        else{
                                            BX24.callMethod("crm.company.userfield.add", { // поле для компании
                                                fields: {
                                                    "FIELD_NAME": companyField,
                                                    "VALUE": "000",
                                                    "EDIT_FORM_LABEL": "ИНН (Узбекистан)",
                                                    "LIST_COLUMN_LABEL": "ИНН (Узбекистан)",
                                                    "USER_TYPE_ID": type,
                                                    'SHOW_IN_LIST' : 'Y',
                                                    "XML_ID": companyField,
                                                    "SETTINGS": { "DEFAULT_VALUE": "Системное поле модуля" }
                                                }
                                            }, function(result) {
                                                if(result.error())
                                                    console.error(result.error());
                                                else
                                                    console.dir(result.data());
                                            });
                                            BX24.callMethod("crm.deal.userfield.add", { // поле для сделки
                                                fields: {
                                                    "FIELD_NAME": companyField,
                                                    "VALUE": "000",
                                                    "EDIT_FORM_LABEL": "ИНН (Узбекистан)",
                                                    "LIST_COLUMN_LABEL": "ИНН (Узбекистан)",
                                                    "USER_TYPE_ID": type,
                                                    'SHOW_IN_LIST' : 'Y',
                                                    "XML_ID": companyField,
                                                    "SETTINGS": { "DEFAULT_VALUE": "Системное поле модуля" }
                                                }
                                            }, function(result) {
                                                if(result.error())
                                                console.error(result.error());
                                                else
                                                    console.dir(result.data());
                                            });
                                            BX24.callMethod("crm.contact.userfield.add", { // поле для контактов
                                                fields: {
                                                    "FIELD_NAME": companyField,
                                                    "VALUE": "000",
                                                    "EDIT_FORM_LABEL": "ИНН (Узбекистан)",
                                                    "LIST_COLUMN_LABEL": "ИНН (Узбекистан)",
                                                    "USER_TYPE_ID": type,
                                                    'SHOW_IN_LIST' : 'Y',
                                                    "XML_ID": companyField,
                                                    "SETTINGS": { "DEFAULT_VALUE": "Системное поле модуля" }
                                                }
                                            }, function(result) {
                                                if(result.error())
                                                console.error(result.error());
                                                else
                                                    console.dir(result.data());
                                            });
                                        }
                                    }
                                );
                            }
                        }
                    );

                /* Перебираем массив пользовательских полей */
                    BX24.callMethod("crm.requisite.userfield.list", 
                        { 
                            order: { "SORT": "ASC" },
                            // filter: { "MANDATORY": "N" }
                        }, 
                        function(result) {
                            if(result.error()){
                                console.error(result.error());
                            }else{
                                let userfieldArr = result.answer.result;
                        /* Создания поля Телефон в реквезитах */
                                if(userfieldArr.some(obj => obj.FIELD_NAME === "UF_CRM_RQ_PHONE")==false){
                                    BX24.callMethod("crm.requisite.userfield.add", {
                                            fields:{
                                                "ENTITY_ID": "CRM_REQUISITE",
                                                "FIELD_NAME": "RQ_PHONE",
                                                "EDIT_FORM_LABEL": "Телефон",            
                                                "USER_TYPE_ID": "string",
                                                "XML_ID": "RQ_PHONE",
                                                "SORT":"700",
                                                "SETTINGS": {}
                                            }
                                        }, 
                                        function(result) {
                                            if(result.error())
                                                console.error(result.error());
                                            else
                                                console.dir(result.data());
                                    });
                                }
                        /* Создания поля ПИНФЛ в реквезитах */
                                if(userfieldArr.some(obj => obj.FIELD_NAME === "UF_CRM_RQ_PINFL")==false){
                                    BX24.callMethod("crm.requisite.userfield.add", {
                                            fields: {
                                                "ENTITY_ID": "CRM_REQUISITE",
                                                "FIELD_NAME": "RQ_PINFL",
                                                "EDIT_FORM_LABEL": "Введите ПИНФЛ",            
                                                "USER_TYPE_ID": "string",
                                                "XML_ID": "RQ_PINFL",
                                                "SORT":"750",
                                                "SETTINGS": {}
                                            }
                                        }, 
                                        function(result) {
                                            if(result.error())
                                                console.error(result.error());
                                            else
                                                console.dir(result.data());
                                    });
                                }
                            }
                        }
                    );

                /* addFieldToPreset - добавляем поля в промисе т.к. метод crm.requisite.preset.field.add асинхронный */
                function addEntityPresetsPormise() {
                    return new Promise((resolve, reject) => {
                        BX24.callMethod("crm.requisite.preset.list", { 
                                filter: { "NAME": "Юр. лицо Узбекистан","XML_ID":"APP_ENTITY_PRESET"},
                            }, function(preset) {
                                if(preset.error()){
                                    console.log(result.error());
                                }else{
                                    if(preset.data().length==0){                                    
                                        /* Создание шаблона реквезитов Юр.лицо Узбекистана */          
                                            let entityPreset = BX24.callMethod("crm.requisite.preset.add", {
                                                    fields:
                                                    { 
                                                        "ENTITY_TYPE_ID": 8,
                                                        "COUNTRY_ID": 1,
                                                        "NAME": "Юр. лицо Узбекистан",
                                                        "XML_ID": "APP_ENTITY_PRESET",
                                                        "ACTIVE": "Y",
                                                        "SORT": 600
                                                    }
                                                }, 
                                                function(result) 
                                                {
                                                    if(result.error()){
                                                        console.error(result.error());
                                                    }else{
                                                        let presetId = result.answer.result;
                                                        // let presetId = 21;
                                                        let presetFieldsArr = [
                                                            {name:"RQ_COMPANY_NAME",title:"	Сокращенное наименование организации",sort:"10"},
                                                            {name:"RQ_COMPANY_FULL_NAME",title:"Полное наименование организации",sort:"20"},
                                                            {name:"RQ_INN",title:"ИНН",sort:"30"},
                                                            {name:"RQ_ADDR",title:"Адрес",sort:"40"},
                                                            {name:"RQ_ACCOUNTANT",title:"Гл. бухгалтер",sort:"50"},
                                                            {name:"RQ_DIRECTOR",title:"Ген. директор",sort:"60"},
                                                            {name:"RQ_PHONE",title:"Телефон",sort:"70"},
                                                            {name:"RQ_OKVED",title:"ОКЭД",sort:"80"},
                                                        ];
                                                        /* установка полей в шаблон */
                                                            /* addFieldToPreset - добавляем поля в промисе т.к. метод crm.requisite.preset.field.add асинхронный */
                                                            function addFieldToPreset(field,id) {
                                                                return new Promise((resolve, reject) => {
                                                                    BX24.callMethod("crm.requisite.preset.field.add", {
                                                                        preset: {"ID": id},
                                                                        fields: {
                                                                            "FIELD_NAME": field.name,
                                                                            "FIELD_TITLE": field.title,
                                                                            "IN_SHORT_LIST": "N",
                                                                            "SORT": field.sort
                                                                        }
                                                                    }, function(result) {
                                                                        if (result.error()) {
                                                                            reject(result.error());
                                                                        } else {
                                                                            resolve(result.data());
                                                                        }
                                                                    });
                                                                });
                                                            }

                                                        /* последовательно передаем поля выше функции */
                                                            async function addFields(arFields,id) {
                                                                for (let field of arFields) {
                                                                    try {
                                                                        let fieldId = await addFieldToPreset(field,id);
                                                                    } catch (error) {
                                                                        console.error("Ошибка при добавлении поля", error);
                                                                    }
                                                                };
                                                                return true;
                                                            }
                                                            resolve(addFields(presetFieldsArr,presetId));
                                                    }
                                                }
                                            );
                                    }else{
                                        resolve(true);
                                    }
                                }
                            }
                        );
                    });
                }
                
                function addIndividualsPresetsPormise() {
                    return new Promise((resolve, reject) => {
                        BX24.callMethod("crm.requisite.preset.list", { 
                                filter: { "NAME": "физ. лицо Узбекистан","XML_ID":"APP_ENTITY_PRESET"},
                            }, function(preset) {
                                if(preset.error()){
                                    console.log(result.error());
                                }else{
                                    if(preset.data().length==0){
                                        /* Создание шаблона физ. лицо Узбекистан  */
                                            let individualPreset = BX24.callMethod("crm.requisite.preset.add", 
                                                {
                                                    fields:
                                                    { 
                                                        "ENTITY_TYPE_ID": 8,
                                                        "COUNTRY_ID": 1,
                                                        "NAME": "Физ. лицо Узбекистан",
                                                        "XML_ID": "APP_ENTITY_PRESET",
                                                        "ACTIVE": "Y",
                                                        "SORT": 700,
                                                    }
                                                }, 
                                                function(presetAddResult) 
                                                {
                                                    if(presetAddResult.error()){
                                                        console.error(presetAddResult);
                                                    }else{
                                                        let presetID = presetAddResult.answer.result;
                                                        let presetFieldsAr = [
                                                            {name:"RQ_LAST_NAME",title:"Фамилия",sort:"10"},
                                                            {name:"RQ_FIRST_NAME",title:"Имя",sort:"20"},
                                                            {name:"RQ_SECOND_NAME",title:"Отчество",sort:"30"},
                                                            {name:"UF_CRM_RQ_PINFL",title:"ИНН",sort:"40"},
                                                        ];
                                                    /* установка полей в шаблон */
                                                        /* addFieldToPreset - добавляем поля в промисе т.к. метод crm.requisite.preset.field.add асинхронный */
                                                        function addFieldToPreset(field,id) {
                                                            return new Promise((resolve, reject) => {
                                                                BX24.callMethod("crm.requisite.preset.field.add", {
                                                                preset: {
                                                                    "ID": id
                                                                },
                                                                fields: {
                                                                    "FIELD_NAME": field.name,
                                                                    "FIELD_TITLE": field.title,
                                                                    "IN_SHORT_LIST": "N",
                                                                    "SORT": field.sort
                                                                }
                                                                }, function(result) {
                                                                if (result.error()) {
                                                                    reject(result.error());
                                                                } else {
                                                                    resolve(result.data());
                                                                }
                                                                });
                                                            });
                                                        }

                                                        /* последовательно передаем поля выше функции */
                                                        async function addFields(arFields,id) {
                                                            for (let field of arFields) {
                                                                try {
                                                                    let fieldId = await addFieldToPreset(field,id);
                                                                } catch (error) {
                                                                    console.error("Ошибка при добавлении поля", error);
                                                                }
                                                            }
                                                            return true;
                                                        }
                                                        resolve(addFields(presetFieldsAr,presetAddResult.answer.result));
                                                    }
                                                }
                                            );
                                    }else{
                                        resolve(true);
                                    }
                                }
                            }
                        );
                    });
                }

                async function addEntityPresets() {
                    try {
                        let presetIndividualId = await addIndividualsPresetsPormise();
                        if(presetIndividualId){
                            let presetEntitId = await addEntityPresetsPormise();
                            if(presetEntitId){
                                return true;
                            }
                        }
                    } catch (error) {
                        console.error("Ошибка при добавлении шаблона", error);
                    }
                }
                let finished = await addEntityPresets();
                if(finished){
                    BX24.installFinish(); // Вызываем installFinish() после завершения всех промисов
                }
            });  
            
        }); 
