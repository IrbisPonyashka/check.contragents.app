
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
});
    // AUTH
    document.querySelector("#submit_btn").addEventListener("click", (e) => {
        e.preventDefault();
        // console.log([document.querySelector("input#auth_login").value,document.querySelector("input#auth_password").value]);
        if(document.querySelector("input#auth_login").value!=="" && document.querySelector("input#auth_password").value!==""){
            var formdata = new FormData();
            formdata.append("grant_type", "password");
            formdata.append("client_id", "8");
            formdata.append("client_secret", "kV6eVfCQ1u1iVR6Def4K5mMQc9M1NG5t9PS4K1IJ");
            formdata.append("scope", "");
            formdata.append("username", document.querySelector("input#auth_login").value);
            formdata.append("password", document.querySelector("input#auth_password").value);
            var requestOptions = {
                method: 'POST',
                body: formdata,
                redirect: 'follow'
            };   
            fetch("https://auth.multibank.uz/oauth/token", requestOptions)
                .then(response => response.text())
                .then(result => {
                    if(!JSON.parse(result).error){
                        // $('#form_login').hide();
                        document.querySelector("#form_login").style.display="none";
                        document.querySelector("[role='alert'].alert__block").style.display="none";
                        document.querySelector(".other_methods").style.display="none";
                        document.querySelector("#form_install").style.display="block";
                        document.querySelector(".login_form__title").innerHTML="Авторизация прошла успешно!";
                        document.querySelector(".login_form__title").style.textAlign="center";
                        // Сохранение логина,пароля и токена авторизации 
                        BX24.callMethod("crm.requisite.preset.list",{},
                            (presetdata) => { 
                                if(presetdata.error()){
                                    console.error(presetdata.data());
                                }else{ 
                                    BX24.callMethod("app.option.set",{
                                        "options":{
                                            "login"   :document.querySelector("input#auth_login").value,
                                            "password":document.querySelector("input#auth_password").value,
                                            "params" : {
                                                "renameCompany" : "true",
                                                "renameContact" : "true",
                                                "EntityPresetId" : presetdata.data()[0].ID,
                                                "IndividaulPresetId" : presetdata.data()[1].ID,
                                            }
                                        }
                                    },(result) => {
                                        if(result.error()){
                                            // alert("Описание ошибки: "+result.error());
                                            console.error(result.error());
                                        }
                                    });             
                                }
                            }
                        ); 
                        // console.log(JSON.parse(result), "SUCCESS");
                    }else{
                        document.querySelector("[role='alert'] .alert__text").innerText="Неправильный логин или пароль.";
                        document.querySelector("[role='alert'].alert__block").style.display="flex";
                        // console.log(JSON.parse(result), "ERROR");
                    }
                })
                .catch(error => console.log('error', error));
        }else{
            document.querySelector("[role='alert'] .alert__text").innerText="Введите авторизационные данные, пожалуйста!";
            document.querySelector("[role='alert'].alert__block").style.display="flex";
        }
    })

    // INSTALL APP
    document.querySelector('#install_btn').addEventListener("click" , (e) => {
        e.preventDefault();
        // $('#installRequestLoader').show();  
        BX24.init(async function(){                                 
            // Установка слушателей - false
            // /* слушатель при Создании карточки контакта */ 
            // BX24.callBind ("onCrmContactAdd","https://micros.uz/it/solutions_our/multicheck.app/v2/app/app.handler.php",function(result){
            //     if(result.error()){
            //         console.error(result.error());
            //     }
            // });

            // /* слушатель при Создании карточки компании */ 
            // BX24.callBind ("onCrmCompanyAdd","https://micros.uz/it/solutions_our/multicheck.app/v2/app/app.handler.php",function(result){
            //     if(result.error()){
            //         console.error(result.error());
            //     }
            // });

            // /* слушатель при Создании карточки сделки */ 
            // BX24.callBind ("onCrmDealAdd","https://micros.uz/it/solutions_our/multicheck.app/v2/app/app.handler.php",function(result){
            //     if(result.error()){
            //         console.error(result.error());
            //     }
            // });
        
            const handlerUrl = `https://micros.uz/it/solutions_our/multicheck.app/v2/app/app.field.php`;
            const type = 'app_multicheck_contragents';
            const oldType = 'crm_cpv_type';
            const companyField = 'MULTICHECK_SEARCH';
            // let type = 'crm_cpv_type'; // старое название кода
            // let companyField = 'APP_CPV_FIELD';

            
            /* Перебираем пользовательские типы */
                BX24.callMethod('userfieldtype.list', {}, 
                    function(result){
                        /* если уже создан тип, то обновляем его */
                        BX24.callMethod('userfieldtype.list', {}, 
                            function(result){
                                /* если уже создан тип, то обновляем его */
                                if(result.data().some(obj => obj.USER_TYPE_ID === "crm_cpv_type")==true){ // нужно проверить тип поля со старым кодом и создать поля с этим типом  
                                    console.log("true", result.data());
                                    BX24.callMethod('userfieldtype.update', 
                                        {
                                            USER_TYPE_ID: oldType,
                                            HANDLER : handlerUrl,
                                            TITLE: 'multicheck.Проверка контрагентов',
                                            DESCRIPTION: 'Пользовательский тип поля модуля multicheck.Проверка контрагентов',
                                            OPTIONS: {height:48}
                                        }, 
                                        (result) => {
                                            if(result.error()){
                                                console.error(result.error());
                                            }else{
                                                // BX24.callBatch(
                                                // {
                                                //     userfield_deal: { // сделки
                                                //         method: 'crm.deal.userfield.add',
                                                //         params: {
                                                //             fields: {
                                                //                 "FIELD_NAME": companyField,
                                                //                 "VALUE": "",
                                                //                 "EDIT_FORM_LABEL": "ИНН || ПИНФЛ (Узбекистан)",
                                                //                 "LIST_COLUMN_LABEL": "ИНН || ПИНФЛ (Узбекистан)",
                                                //                 "USER_TYPE_ID": oldType,
                                                //                 'SHOW_IN_LIST' : 'Y',
                                                //                 "XML_ID": companyField,
                                                //                 "SETTINGS": { "DEFAULT_VALUE": "Системное поле модуля multicheck.Проверка контрагентов " }
                                                //             }
                                                //         }
                                                //     }
                                                // }, (result) => {
                                                //     console.log(result.data());
                                                // });
                                                BX24.installFinish(); // Вызываем installFinish() после завершения всех BX запросов
                                            }
                                        }
                                    );
                                }else{
                                    if(result.data().some(obj => obj.USER_TYPE_ID === "app_multicheck_contragents")==true){ // переустановка приложения с причиной или без
                                        BX24.callBatch( // создаем поля, для случаев если они ранее были удалены случайно
                                        {
                                            userfield_company: { // компании
                                                method: 'crm.company.userfield.add',
                                                params: {
                                                    fields: {
                                                        "FIELD_NAME": companyField,
                                                        "VALUE": "",
                                                        "EDIT_FORM_LABEL": "ИНН || ПИНФЛ (Узбекистан)",
                                                        "LIST_COLUMN_LABEL": "ИНН || ПИНФЛ (Узбекистан)",
                                                        "USER_TYPE_ID": type,
                                                        'SHOW_IN_LIST' : 'Y',
                                                        "XML_ID": companyField,
                                                        "SETTINGS": { "DEFAULT_VALUE": "Системное поле модуля multicheck.Проверка контрагентов " }
                                                    }
                                                }
                                            },
                                            userfield_contact: { // контакты
                                                method: 'crm.contact.userfield.add',
                                                params: {
                                                    fields: {
                                                        "FIELD_NAME": companyField,
                                                        "VALUE": "",
                                                        "EDIT_FORM_LABEL": "ИНН || ПИНФЛ (Узбекистан)",
                                                        "LIST_COLUMN_LABEL": "ИНН || ПИНФЛ (Узбекистан)",
                                                        "USER_TYPE_ID": type,
                                                        'SHOW_IN_LIST' : 'Y',
                                                        "XML_ID": companyField,
                                                        "SETTINGS": { "DEFAULT_VALUE": "Системное поле модуля multicheck.Проверка контрагентов " }
                                                    }
                                                }
                                            },
                                            userfield_deal: { // сделки
                                                method: 'crm.deal.userfield.add',
                                                params: {
                                                    fields: {
                                                        "FIELD_NAME": companyField,
                                                        "VALUE": "",
                                                        "EDIT_FORM_LABEL": "ИНН || ПИНФЛ (Узбекистан)",
                                                        "LIST_COLUMN_LABEL": "ИНН || ПИНФЛ (Узбекистан)",
                                                        "USER_TYPE_ID": type,
                                                        'SHOW_IN_LIST' : 'Y',
                                                        "XML_ID": companyField,
                                                        "SETTINGS": { "DEFAULT_VALUE": "Системное поле модуля multicheck.Проверка контрагентов " }
                                                    }
                                                }
                                            }
                                        }, (result) => {
                                            BX24.installFinish(); // Вызываем installFinish() после завершения всех промисов
                                        });
                                    }else{  
                                        BX24.callMethod('userfieldtype.add', 
                                            {
                                                USER_TYPE_ID: type,
                                                HANDLER : handlerUrl,
                                                TITLE: 'multicheck.Проверка контрагентов',
                                                DESCRIPTION: 'Пользовательский тип поля модуля multicheck.Проверка контрагентов',
                                                OPTIONS: {height:48}
                                            }, 
                                            (result) => {
                                                if(result.error()){
                                                    // Ошибка скорее всего будет связана с тем что уже есть такой тип
                                                    console.error(result.error());
                                                }else{
                                                    BX24.callBatch(
                                                    {
                                                        userfield_company: { // компании
                                                            method: 'crm.company.userfield.add',
                                                            params: {
                                                                fields: {
                                                                    "FIELD_NAME": companyField,
                                                                    "VALUE": "",
                                                                    "EDIT_FORM_LABEL": "ИНН || ПИНФЛ (Узбекистан)",
                                                                    "LIST_COLUMN_LABEL": "ИНН || ПИНФЛ (Узбекистан)",
                                                                    "USER_TYPE_ID": type,
                                                                    'SHOW_IN_LIST' : 'Y',
                                                                    "XML_ID": companyField,
                                                                    "SETTINGS": { "DEFAULT_VALUE": "Системное поле модуля multicheck.Проверка контрагентов " }
                                                                }
                                                            }
                                                        },
                                                        userfield_contact: { // контакты
                                                            method: 'crm.contact.userfield.add',
                                                            params: {
                                                                fields: {
                                                                    "FIELD_NAME": companyField,
                                                                    "VALUE": "",
                                                                    "EDIT_FORM_LABEL": "ИНН || ПИНФЛ (Узбекистан)",
                                                                    "LIST_COLUMN_LABEL": "ИНН || ПИНФЛ (Узбекистан)",
                                                                    "USER_TYPE_ID": type,
                                                                    'SHOW_IN_LIST' : 'Y',
                                                                    "XML_ID": companyField,
                                                                    "SETTINGS": { "DEFAULT_VALUE": "Системное поле модуля multicheck.Проверка контрагентов " }
                                                                }
                                                            }
                                                        },
                                                        userfield_deal: { // сделки
                                                            method: 'crm.deal.userfield.add',
                                                            params: {
                                                                fields: {
                                                                    "FIELD_NAME": companyField,
                                                                    "VALUE": "",
                                                                    "EDIT_FORM_LABEL": "ИНН || ПИНФЛ (Узбекистан)",
                                                                    "LIST_COLUMN_LABEL": "ИНН || ПИНФЛ (Узбекистан)",
                                                                    "USER_TYPE_ID": type,
                                                                    'SHOW_IN_LIST' : 'Y',
                                                                    "XML_ID": companyField,
                                                                    "SETTINGS": { "DEFAULT_VALUE": "Системное поле модуля multicheck.Проверка контрагентов " }
                                                                }
                                                            }
                                                        }
                                                    }, (result) => {
                                                        BX24.installFinish(); // Вызываем installFinish() после завершения всех промисов
                                                    });
                                                }
                                            }
                                        );
                                    }
                                }
                            }
                        );
                    }
                );
        });  
            
    }); 
