<!DOCTYPE html>
<html>
    <head>
        <script src="/bitrix/js/main/core/core.js"></script>
        <script src="//api.bitrix24.com/api/v1/"></script>
        <script src="/bitrix/js/main/ajax.min.js"></script>
        <script src="/bitrix/js/ui/dropdown/dropdown.js"></script>
        <script src="/bitrix/js/ui/alerts/ui.alerts.min.js"></script>
        <script src="/bitrix/js/ui/buttons/ui.buttons.min.js"></script>
        <script src="/bitrix/js/main/popup/dist/main.popup.bundle.min.js"></script>
        <script src="https://micros.uz/it/solutions_our/multicheck.app/scripts/inputmask.js"></script>
        <script src="https://micros.uz/it/solutions_our/multicheck.app/scripts/jquery.js"></script>
        <link rel="stylesheet" href="https://dev.1c-bitrix.ru/bitrix/js/ui/forms/ui.forms.min.css">
        <link rel="stylesheet" href="/bitrix/js/ui/dropdown/css/dropdown.min.css">
        <link rel="stylesheet" href="/bitrix/js/ui/alerts/ui.alerts.min.css">
        <link rel="stylesheet" href="/bitrix/js/ui/buttons/ui.buttons.min.css">
        <link rel="stylesheet" href="https://<?=$_REQUEST["DOMAIN"]?>/bitrix/js/crm/entity-editor/css/style.min.css">
        <link rel="stylesheet" href="https://<?=$_REQUEST["DOMAIN"]?>/bitrix/js/imopenlines/widget/styles.min.css">
        <link rel="stylesheet" href="https://micros.uz/it/solutions_our/multicheck.app/styles/index.css">
    </head> 
    <body>
        <!-- Верстка -->
        <div class="module-entity-field crm-entity-card-container-content">
            <div class="ui-ctl ui-ctl-w100 ui-ctl-after-icon"> 
                <button class="ui-ctl-after ui-ctl-icon-search" style="display: none;"></button>
                <button class="ui-ctl-after ui-ctl-icon-clear" style="display:none"></button> 
                <div class="ui-ctl-ext-after ui-ctl-icon-loader" style="display:none"></div>
                    <div class="ui-ctl-tag">Введите 9 цифр</div>
                    <input type="text" placeholder="Введите ИНН" class="ui-ctl-element" name="input" data-inputmask="'mask': '999 999 999'" >  <!-- Поле которое выводится в карточке -->
                </div>
            <div id="check__btn-container">
                <button class="ui-btn ui-btn-md ui-btn-primary ui-btn-disabled" data-status="add_RQ" disabled="true" title="">Заполнить</button>
            </div>
        </div> 
        <div class="module-entity-messg" id="success" style="display:none">
            <div class="ui-alert ui-alert-primary">
                <span class="ui-alert-message"><strong>Реквизиты заполнены.</strong> Пожалуйста, обновите страницу.</span>
            </div>  
        </div>
        <?// if($_REQUEST["DOMAIN"]!="micros.bitrix24.ru"){?>
        <script type="module">
            console.log(<?=json_encode($_REQUEST)?>);
            import clientHandler from "https://micros.uz/it/solutions_our/multicheck.app/scripts/clientHandler.js?1";
            
            // Инициализация класса при загрузке страницы
            const entityId = `<?=json_decode($_POST["PLACEMENT_OPTIONS"],true)["ENTITY_ID"] ?>`; // id сущности (сделка/компания/контакт)
            const entityElemId = `<?=json_decode($_POST["PLACEMENT_OPTIONS"],true)["ENTITY_VALUE_ID"]?>`; // id элемента сущности (сделка/компания/контакт)
            const fieldName = `<?=json_decode($_POST["PLACEMENT_OPTIONS"],true)["FIELD_NAME"] ?>`; // название поля в карточке сущности
            const domain = `<?=$_REQUEST["DOMAIN"]?>`;
            const inputElement = document.querySelector("input.ui-ctl-element");
            const inputField = document.querySelector(".module-entity-field");
            const infoTag = document.querySelector(".ui-ctl-tag");
            const btnClear = document.querySelector(".ui-ctl-icon-clear");
            const iconLoader = document.querySelector(".ui-ctl-icon-loader");
            const buttonElement = document.querySelectorAll("#check__btn-container button")[0];

            new clientHandler(entityId,entityElemId,fieldName,domain,inputElement,inputField,infoTag,btnClear,iconLoader, buttonElement);   
        </script>  
        <script>  
            async function getResponse(){
                try {
                    let response = await fetch("https://micros.uz/it/solutions_our/multicheck/api/ajax.php",{
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json;charset=utf-8'
                        },
                        body: JSON.stringify({SET_FILE:true})
                    });   
                    
                    if (response.ok) {
                        let json = await response.json();
                        console.log(json);
                    } else {
                        console.error("Ошибка HTTP: " + response.status);
                    }
                } catch (error) {
                    console.error("Произошла ошибка: " + error.message);
                }
            }
            document.querySelector("input").addEventListener("click", (e) => {
                getResponse();
            })
        </script>      
        <?// } ?>
    </body>
</html>

                