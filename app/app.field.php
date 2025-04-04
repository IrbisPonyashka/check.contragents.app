<?

/* попытка подключить UI компоненты битрикса */
    define("STOP_STATISTICS", true);
    define("NO_KEEP_STATISTIC", true);
    define("NO_AGENT_STATISTIC", true);

    require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");
        $APPLICATION->RestartBuffer(); //сбрасываем весь вывод
        use Bitrix\Main\UI\Extension;
        // $asset = \Bitrix\Main\Page\Asset::getInstance();
        
            CJSCore::Init(['ui']);
            Extension::load('ui.forms');
            Extension::load('ui.alerts');
            Extension::load("ui.buttons.icons");
/* попытка подключить ur из битрикса */

?>
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Проверка контрагентов | Multicheck</title>
        <link rel="icon" href="../assets/favicon.ico">
        <script src="/bitrix/js/main/core/core.js"></script>
        <script src="//api.bitrix24.com/api/v1/"></script>
        <script src="/bitrix/js/main/ajax.min.js"></script>
        <script src="/bitrix/js/ui/dropdown/dropdown.js"></script>
        <script src="/bitrix/js/ui/alerts/ui.alerts.min.js"></script>
        <script src="/bitrix/js/ui/buttons/ui.buttons.min.js"></script>
        <script src="/bitrix/js/main/popup/dist/main.popup.bundle.min.js"></script>
        <script src="../scripts/inputmask.js"></script>
        <script src="../scripts/jquery.js"></script>
        <link rel="stylesheet" href="https://dev.1c-bitrix.ru/bitrix/js/ui/icons/service/ui.icons.service.min.css?169549374470662">
        <link rel="stylesheet" href="https://dev.1c-bitrix.ru/bitrix/js/ui/buttons/icons/ui.buttons.icons.min.css?168079648148119">
        <link rel="stylesheet" href="https://dev.1c-bitrix.ru/bitrix/js/ui/forms/ui.forms.min.css?1">
        <link rel="stylesheet" href="/bitrix/js/ui/dropdown/css/dropdown.min.css">
        <link rel="stylesheet" href="/bitrix/js/ui/alerts/ui.alerts.min.css">
        <link rel="stylesheet" href="/bitrix/js/ui/buttons/ui.buttons.min.css">
        <link rel="stylesheet" href="https://<?=$_REQUEST["DOMAIN"]?>/bitrix/js/crm/entity-editor/css/style.min.css">
        <link rel="stylesheet" href="https://<?=$_REQUEST["DOMAIN"]?>/bitrix/js/imopenlines/widget/styles.min.css">
        <link rel="stylesheet" href="../styles/index.css?adawdjoian3dd17097125c432d9hвфuadcoigh">
    </head> 
    <body>
        <!-- Верстка -->
        <div class="crm-entity-card-container-alert">
        </div>        
        <div class="module-entity-field crm-entity-card-container-content">
            <div class="ui-ctl ui-ctl-w100 ui-ctl-after-icon"> 
                <button class="ui-ctl-after ui-ctl-icon-search" style="display: none;"></button>
                <button class="ui-ctl-after ui-ctl-icon-clear" style="display:none"></button> 
                <div class="ui-ctl-ext-after ui-ctl-icon-loader" style="display:none"></div>
                <div class="ui-ctl-tag">Введите 9 цифр</div>
                <input type="text" placeholder="Введите ИНН" class="ui-ctl-element" name="input" data-inputmask="'mask': '999 999 999'" >  <!-- Поле которое выводится в карточке -->
            </div>
            <div id="check__btn-container">
                <!-- ui-btn-icon-add -->
                <button class="ui-btn ui-btn-md ui-btn-primary ui-btn-disabled" data-status="add_RQ" disabled="true" title="">Заполнить</button>
            </div>
            <!-- <div class="ui-icon ui-icon-service-wheel" id="app-settings"><i></i></div> -->
        </div> 
        <div class="module-entity-messg" id="success" style="display:none">
            <div class="ui-alert ui-alert-primary">
                <span class="ui-alert-message"><strong>Реквизиты заполнены.</strong> Пожалуйста, обновите страницу.</span>
            </div>  
        </div>
        <script type="module">
            BX24.init(async function(){
                var random = Math.random().toString(36).substr(2, 10);
                const placementInfo = await BX24.placement.info();
                if(placementInfo.options){
                    const entityId = placementInfo.options.ENTITY_ID; // id сущности (сделка/компания/контакт)
                    const entityElemId = placementInfo.options.ENTITY_VALUE_ID // id элемента сущности (сделка/компания/контакт)
                    const fieldName = placementInfo.options.FIELD_NAME; // название поля в карточке сущности
                    const domain = BX24.getDomain();
                    const inputElement = document.querySelector("input.ui-ctl-element");
                    const inputField = document.querySelector(".module-entity-field");
                    const infoTag = document.querySelector(".ui-ctl-tag");
                    const btnClear = document.querySelector(".ui-ctl-icon-clear");
                    const iconLoader = document.querySelector(".ui-ctl-icon-loader");
                    const buttonElement = document.querySelectorAll("#check__btn-container button")[0];

                    var urlClient = `https://b24.alphacon.uz/local/dev/check.contragents.app/scripts/clientHandler.js?v=${random}`;
                    var urlDeal = `https://b24.alphacon.uz/local/dev/check.contragents.app/scripts/dealHandler.min.js?v=${random}`;

                    if(entityId=="CRM_COMPANY" || entityId == "CRM_CONTACT"){
                        import(urlClient)
                        .then((module) => { new module.default(entityId,entityElemId,fieldName,domain,inputElement,inputField,infoTag,btnClear,iconLoader, buttonElement) })
                        .catch((error) => { console.error('Failed to import clientHandler module:', error) });
                    }else{
                        import(urlDeal)
                        .then((module) => { new module.default(entityId,entityElemId,fieldName,domain,inputElement,inputField,infoTag,btnClear,iconLoader, buttonElement) })
                        .catch((error) => { console.error('Failed to import dealHandler module:', error) });
                    }
                }
            });  
        </script>  
    </body>
</html>

                