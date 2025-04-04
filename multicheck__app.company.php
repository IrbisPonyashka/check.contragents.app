<?php
$_SERVER["DOCUMENT_ROOT"] = "/home/bitrix/www";
define("NO_KEEP_STATISTIC", true);
define("NOT_CHECK_PERMISSIONS", true);
define('CHK_EVENT', true);


use Bitrix\Main\Web\HttpClient;
// use Bitrix\Main\Type\DateTime;
require ($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");

// $currentDate = new DateTime();
// $formattedCurrentDate = $currentDate->format('Y-m-d');
// echo '<pre>'; print_r($formattedCurrentDate); echo '</pre>';

function initAutoUpdate()
{
    
    $fields = [
        "order" => [ "ID" => "ASC" ],
        "filter" => [
            "<UF_CRM_1668149033260" => "9",
            "COMPANY_ID" => null,
            "CATEGORY_ID" => [22, 28, 62],
            "=UF_CRM_1700752927154" => "" // multicheck.проверка Обновления
        ],
        "select" => ["ID","TITLE","UF_CRM_APP_CPV_FIELD","UF_CRM_1668149033260","COMPANY_ID","CATEGORY_ID","UF_CRM_1700752927154","ASSIGNED_BY_ID", "UF_CRM_IS_RQ_UPDATED"],
    ];
    $dealList = json_decode(bx24CallMethod($fields,"crm.deal.list"),1);
    
    if(count($dealList["result"])){
        
        foreach($dealList["result"] as $arDealKey => $arDealVal)
        {
            $inn = $arDealVal["UF_CRM_APP_CPV_FIELD"]==null?str_replace(" ","",$arDealVal["UF_CRM_1668149033260"]):str_replace(" ","",$arDealVal["UF_CRM_APP_CPV_FIELD"]);
            if($inn!=null&&$inn!="undefined"&&(strlen($inn)==9||strlen($inn)==14)){
                // echo '<pre>'; print_r([$inn,$arDealVal,$dealList["total"]]); echo '</pre>';
                $fields = [
                    "filter" => [ "RQ_INN"=> $inn ],
                    "select" => ["ID","ENTITY_ID","RQ_INN"]
                ];
                $getReqs = json_decode(bx24CallMethod($fields,"crm.requisite.list"),1); // ищем реквизиты в CRM
                if(count($getReqs["result"])){
                    $fields = [
                        "filter" => ["ID" => $getReqs["result"][0]["ENTITY_ID"]],
                        "select" => ["ID", "TITLE" , "UF_CRM_APP_CPV_FIELD", "UF_CRM_MULTICHECK_UPDATE_DATE","UF_CRM_1692078684748"]
                    ];
                    $getCompany = json_decode(bx24CallMethod($fields,"crm.company.list"),1); // информацию о компании
                    if($getCompany["result"][0]){ // Проверим, компанию реквизита, если оно обновлено multichek'ом, то привязываем.
                        $companyDateTime = $getCompany["result"][0]["UF_CRM_MULTICHECK_UPDATE_DATE"] ? new DateTime($getCompany["result"][0]["UF_CRM_MULTICHECK_UPDATE_DATE"]) : null;
                        $currentDateTime = new DateTime();
                        $currentDateTime->modify('-1 month');
                        if ($companyDateTime==null || $companyDateTime->format('Y-m-d') < $currentDateTime->format('Y-m-d')) {
                        // если null или значение больше месяца значит обновлен давно, обновляем реквизиты компании
                            $gnkEntity = getEntityGnk($inn);
                            $type=strlen($inn)==9?"entity":"individual";
                            if($gnkEntity["success"]){
                                $updateCompany = updateCompany($getCompany["result"][0]["ID"],$inn,$gnkEntity, $type, $getReqs["result"][0]["ID"]);   /* обновляем компанию */
                                if($updateCompany){
                                    $bindCompanyToDeal = bindCompanyToDeal($arDealVal, $getCompany["result"][0]["ID"], $getCompany["result"][0]["TITLE"], $inn,$gnkEntity);
                                    if($bindCompanyToDeal){
                                        LogAddTest(["__update__",$getCompany["result"][0]["ID"],$inn,$gnkEntity,$type], "__update__");
                                        // echo '<pre>'; print_r(["__update__",$getCompany["result"][0]["ID"],$inn,$gnkEntity,$type]); echo '</pre>';
                                    }
                                }
                            }else if(!$gnkEntity["success"] && $gnkEntity["message"]){ // токен истёк
                                $_SESSION["MULTIBANK_API_TOKEN"] = null;
                                getAuthToken();
                                $gnkEntity = getEntityGnk($inn);
                                if($gnkEntity["success"]){
                                    $updateCompany = updateCompany($getCompany["result"][0]["ID"],$inn,$gnkEntity, $type, $getReqs["result"][0]["ID"]);  /* обновляем компанию */
                                    if($updateCompany){
                                        $bindCompanyToDeal = bindCompanyToDeal($arDealVal, $getCompany["result"][0]["ID"], $getCompany["result"][0]["TITLE"], $inn,$gnkEntity);
                                        if($bindCompanyToDeal){
                                            LogAddTest(["__update__",$getCompany["result"][0]["ID"],$inn,$gnkEntity,$type], "__update__");
                                            // echo '<pre>'; print_r(["__update__",$getCompany["result"][0]["ID"],$inn,$gnkEntity,$type]); echo '</pre>';
                                        }
                                    }
                                }
                            }else{ // инн некорректное
                                $setCheckedToEntity = setCheckedToEntity($arDealVal["ID"]); /* инн некорректное - метим компанию */
                                if($setCheckedToEntity){
                                    LogAddTest($arDealVal["ID"], "__not_correct__");
                                    // echo '<pre>'; print_r($setCheckedToEntity); echo '</pre>';
                                    // return true;
                                }
                            }

                        } else { // ------------------------------------------------------------
                        // иначе просто крепим, компанию
                            $gnkData = getEntityGnk($inn);
                            $type=strlen($inn)==9?"entity":"individual";
                            if($gnkData["success"]){
                                $bindCompanyToDeal = bindCompanyToDeal($arDealVal, $getCompany["result"][0]["ID"], $getCompany["result"][0]["TITLE"], $inn,$gnkData);
                                if($bindCompanyToDeal){
                                    // LogAddTest(["__update__",$getCompany["result"][0]["ID"],$inn,$gnkData,$type], "__update__");
                                    echo '<pre>'; print_r(["__update__",$getCompany["result"][0]["ID"],$inn,$gnkData,$type]); echo '</pre>';
                                }
                            }else if(!$gnkData["success"] && $gnkData["message"]){ // токен истёк
                                $_SESSION["MULTIBANK_API_TOKEN"] = null;
                                getAuthToken();
                                $gnkData = getEntityGnk($inn);
                                if($gnkData["success"]){
                                    $bindCompanyToDeal = bindCompanyToDeal($arDealVal, $getCompany["result"][0]["ID"], $getCompany["result"][0]["TITLE"], $inn,$gnkData);
                                    if($bindCompanyToDeal){
                                        // LogAddTest(["__update__",$getCompany["result"][0]["ID"],$inn,$gnkData,$type], "__update__");
                                        echo '<pre>'; print_r(["__update__",$getCompany["result"][0]["ID"],$inn,$gnkData,$type]); echo '</pre>';
                                    }
                                }
                            }else{ // инн некорректное
                                $setCheckedToEntity = setCheckedToEntity($arDealVal["ID"]); /* инн некорректное - метим компанию */
                                if($setCheckedToEntity){
                                    echo '<pre>'; print_r($setCheckedToEntity); echo '</pre>';
                                    // return true;
                                }
                            }
                        }
                    }
                }else{ // Реквизиты не найдены, ищем в GNK и создаем с нуля
                    $gnkData = getEntityGnk($inn);
                    $type=strlen($inn)==9?"entity":"individual";
                    if($gnkData["success"]){
                        $createCompany = updateCompany(false,$inn,$gnkData, $type, false);   /* сощздаем компанию */
                        if($createCompany["result"]){
                            $bindCompanyToDeal = bindCompanyToDeal($arDealVal, $createCompany["result"],false, $inn,$gnkData);
                            if($bindCompanyToDeal){
                                LogAddTest(["__create__",$createCompany["result"],$inn,$gnkData,$type], "__create__");
                                // echo '<pre>'; print_r(["__create__",$createCompany["result"],$inn,$gnkData,$type]); echo '</pre>';
                            }
                        }
                    }else if(!$gnkData["success"] && $gnkData["message"]){ // токен истёк
                        $_SESSION["MULTIBANK_API_TOKEN"] = null;
                        getAuthToken();
                        $gnkData = getEntityGnk($inn);
                        if($gnkData["success"]){
                            $createCompany = updateCompany(false,$inn,$gnkData, $type, false);   /* сощздаем компанию */
                            if($createCompany["result"]){
                                $bindCompanyToDeal = bindCompanyToDeal($arDealVal, $createCompany["result"],false, $inn,$gnkData);
                                if($bindCompanyToDeal){
                                    LogAddTest(["__create__2",$createCompany["result"],$inn,$gnkData,$type], "__create__");
                                    // echo '<pre>'; print_r(["__create__2",$createCompany["result"],$inn,$gnkData,$type]); echo '</pre>';
                                }
                            }   
                        }
                    }else{ // инн некорректное
                        $setCheckedToEntity = setCheckedToEntity($arDealVal["ID"]); /* инн некорректное - метим компанию */
                        if($setCheckedToEntity){
                            LogAddTest($arDealVal["ID"], "__not_correct__");
                            // echo '<pre>'; print_r($setCheckedToEntity); echo '</pre>';
                            // return true;
                        }
                    }
                }
            }else{
                $setCheckedToEntity = setCheckedToEntity($arDealVal["ID"]); /* инн некорректное - метим компанию */
                if($setCheckedToEntity){
                    // echo '<pre>'; print_r($setCheckedToEntity); echo '</pre>';
                    // return true;
                }
            }

        }
    }

}


function updateCompany($companyId,$inn,$gnkEntity, $type, $rqId)
{
    $arDataGnk = $gnkEntity["data"];
    $presetId;
    $presetName;
    $type=="entity" ? ($presetName = "Юр. лицо Узбекистан" && $presetId = 7) : ($presetName = "ИП" && $presetId = 3) ; 
    $directorBio = $arDataGnk["gnk_company_director_name"];
    $directorBio = $directorBio?explode(" ",$directorBio):"";
        if($arDataGnk["gnk_na1Name"]=="Семейное предприятие"){
            $companyTypeField = 4712;
        }else if($arDataGnk["gnk_na1Name"]=="Частное предприятие"){
            $companyTypeField = 4716;
        }else if($arDataGnk["gnk_na1Name"]=="Общество с огр. ответствен."){
            $companyTypeField = 4714;
        }
        
    $currentDate = new DateTime();
    $formattedCurrentDate = $currentDate->format('Y-m-d');
    $dataToUpdate = [
        "fields" => [
            "TITLE"=>$arDataGnk["gnk_company_name_full"],
            // "BANKING_DETAILS" => `` 
            "UF_CRM_1680515150190"=>$companyTypeField, // Форма собственности
            "UF_CRM_1682675357173"=>$arDataGnk["gnk_company_address"], // юр адресс
            "UF_CRM_COMPANY_1669731310647"=>$inn, // ИНН
            "UF_CRM_APP_CPV_FIELD"=>$inn, // ИНН
            "UF_CRM_1682674390749"=>$arDataGnk["gnk_company_account"], // РС
            "UF_CRM_1682674424461"=>$arDataGnk["gnk_company_mfo"], // мфо/бик 
            "UF_CRM_1682674405653"=>$arDataGnk["gnk_company_oked"], // окед
            "UF_CRM_1695386350"=>$arDataGnk["status_nds"], // 
            "UF_CRM_1683721283163"=>$directorBio[0], // фамилия директора
            "UF_CRM_1689846523"=>$directorBio[1], // имя директора
            "UF_CRM_1692078684748"=> "true",// bool
            "UF_CRM_MULTICHECK_UPDATE_DATE"=> $formattedCurrentDate,// дата обновления
        ],
        "params" => [ "REGISTER_SONET_EVENT" => "N" ]    
    ];
    // dataToUpdate[dynamicKey] = inn;
    if($rqId && $companyId){
        $responseRequisite = updateRequisite($rqId, $companyId,$inn,$gnkEntity, $type);
        if($responseRequisite){
            $dataToUpdate["id"] = $companyId;
            $updateResult = json_decode(bx24CallMethod($dataToUpdate,"crm.company.update"),1);
            if($updateResult){
                return $updateResult;
            }
        }
    }else{
        $updateResult = json_decode(bx24CallMethod($dataToUpdate,"crm.company.add"),1);
        if($updateResult){
            $responseRequisite = createRequisite($updateResult["result"],$inn,$gnkEntity, $type);
            if($responseRequisite){
                return $updateResult;
            }
        }
    }

}

function createRequisite($companyId,$inn,$gnkEntity, $type)
{
    $arDataGnk = $gnkEntity["data"];
    if ($type == "entity") {
        $presetName = "Юр. лицо Узбекистан";
        $presetId = 7;
    } else {
        $presetName = "ИП";
        $presetId = 3;
    };
    // echo '<pre>'; print_r([$presetName,$presetId]); echo '</pre>';
    $directorBio = $arDataGnk["gnk_company_director_name"];
    $directorBio = $directorBio?explode(" ",$directorBio):"";
    $fields = [
        "fields" => [
            "RQ_INN" => $inn,
            "ENTITY_TYPE_ID" => 4,
            "ENTITY_ID" => $companyId,
            "PRESET_ID" => $presetId, //preset.ID,
            "ACTIVE" => "Y",    
            "NAME"  =>  $presetName,
            "RQ_COMPANY_NAME" =>  $arDataGnk["gnk_company_name"],
            "RQ_COMPANY_FULL_NAME" =>  $arDataGnk["gnk_company_name_full"],
            "RQ_DIRECTOR" =>  $arDataGnk["gnk_company_director_name"],
            "RQ_ACCOUNTANT" =>  $arDataGnk["gnk_company_accountant"],
            "RQ_OKVED" =>  $arDataGnk["gnk_company_oked"],
            "RQ_PHONE" =>  "",
            "RQ_LAST_NAME" =>   $directorBio[0] ,
            "RQ_FIRST_NAME" =>  $directorBio[1] ,
            "RQ_SECOND_NAME" => $directorBio[2] 
        ],
        "params" => [ "REGISTER_SONET_EVENT" => "N" ]    
    ];
    $createdRq = json_decode(bx24CallMethod($fields,"crm.requisite.add"),1);
    if($createdRq){
        $adresFields = [
            "fields" => [
                "TYPE_ID" => 6, // юр адресс
                "ENTITY_TYPE_ID" => 8, // реквизиты
                "ENTITY_ID" => $createdRq["result"], // id реквизита
                "ADDRESS_1" => $arDataGnk["gnk_company_address"],
            ]
        ];
        json_decode(bx24CallMethod($adresFields,"crm.address.add"),1);
        $bankDetailFields = [
            "fields" => [
                "ENTITY_ID" => $createdRq["result"], // id реквизита
                "COUNTRY_ID" => 1,
                "NAME" => "Первичный счёт",
                "RQ_BIK" => $arDataGnk["gnk_company_mfo"],
                "RQ_ACC_NUM" => $arDataGnk["gnk_company_account"],        
                "RQ_ACC_CURRENCY" => "Узбекский сум",    
            ]
        ];
        json_decode(bx24CallMethod($bankDetailFields,"crm.requisite.bankdetail.add"),1);
        return $createdRq;
    }else{
        return true;
    }

}

function updateRequisite($rqId, $companyId,$inn,$gnkEntity, $type)
{
    $arDataGnk = $gnkEntity["data"];
    if ($type == "entity") {
        $presetName = "Юр. лицо Узбекистан";
        $presetId = 7;
    } else {
        $presetName = "ИП";
        $presetId = 3;
    };
    // echo '<pre>'; print_r([$presetName,$presetId]); echo '</pre>';
    $directorBio = $arDataGnk["gnk_company_director_name"];
    $directorBio = $directorBio?explode(" ",$directorBio):"";
    // $batchParams = [
    //     "adress_update" => 
    // ];
    // $batchFields = [
    //     "halt" => 0,
    //     "cmd" => [
    //         "adress_update" => [
    //             "method" => "crm.address.update",
    //             "params" => [
    //                 "fields" => [
    //                     "TYPE_ID" => 6, // юр адресс
    //                     "ENTITY_TYPE_ID" => 8, // реквизиты
    //                     "ENTITY_ID" => $rqId, // id реквизита
    //                     "ADDRESS_1" => $arDataGnk["gnk_company_address"],
    //                 ]
    //             ]
    //         ],
    //         "bank_get" => [
    //             "method" => "crm.requisite.bankdetail.list",
    //             "filter" => ["ENTITY_ID" => $rqId],
    //             "select" => ["ID"]
    //         ],
    //         "bank_update" => [
    //             "method" => "crm.requisite.bankdetail.update",
    //             "params" => [
    //                 "id" => '$result[bank_get][result][0][ID]',
    //                 "fields" => [
    //                     "ENTITY_ID" => $rqId, // id реквизита
    //                     "COUNTRY_ID" => 1,
    //                     "NAME" => "Первичный счёт",
    //                     "RQ_BIK" => $arDataGnk["gnk_company_mfo"],
    //                     "RQ_ACC_NUM" => $arDataGnk["gnk_company_account"],        
    //                     "RQ_ACC_CURRENCY" => "Узбекский сум",
    //                 ]
    //             ]
    //         ],
    //     ],
    // ];
    
    $fields = [
        "id" => $rqId,
        "fields" => [
            "RQ_INN" => $inn,
            "ENTITY_TYPE_ID" => 4,
            "ENTITY_ID" => $companyId,
            "PRESET_ID" => $presetId, //preset.ID,
            "ACTIVE" => "Y",    
            "NAME"  =>  $presetName,
            "RQ_COMPANY_NAME" =>  $arDataGnk["gnk_company_name"],
            "RQ_COMPANY_FULL_NAME" =>  $arDataGnk["gnk_company_name_full"],
            "RQ_DIRECTOR" =>  $arDataGnk["gnk_company_director_name"],
            "RQ_ACCOUNTANT" =>  $arDataGnk["gnk_company_accountant"],
            "RQ_OKVED" =>  $arDataGnk["gnk_company_oked"],
            "RQ_PHONE" =>  "",
            "RQ_LAST_NAME" =>   $directorBio[0] ,
            "RQ_FIRST_NAME" =>  $directorBio[1] ,
            "RQ_SECOND_NAME" => $directorBio[2] 
        ],
        "params" => [ "REGISTER_SONET_EVENT" => "N" ]    
    ];
    $adresFields = [
        "fields" => [
            "TYPE_ID" => 6, // юр адресс
            "ENTITY_TYPE_ID" => 8, // реквизиты
            "ENTITY_ID" => $rqId, // id реквизита
            "ADDRESS_1" => $arDataGnk["gnk_company_address"],
        ]
    ];
    json_decode(bx24CallMethod($adresFields,"crm.address.add"),1);
    $bankGetField = [
        "filter" => ["ENTITY_ID" => $rqId],
        "select" => ["ID"]
    ];
    $bank_get = json_decode(bx24CallMethod($bankGetField,"crm.requisite.bankdetail.list"),1);
    if($bank_get){
        $bankDetailFields = [
            "id" => $bank_get["result"][0]["ID"],
            "fields" => [
                "ENTITY_ID" => $rqId, // id реквизита
                "COUNTRY_ID" => 1,
                "NAME" => "Первичный счёт",
                "RQ_BIK" => $arDataGnk["gnk_company_mfo"],
                "RQ_ACC_NUM" => $arDataGnk["gnk_company_account"],        
                "RQ_ACC_CURRENCY" => "Узбекский сум",    
            ]
        ];
        json_decode(bx24CallMethod($bankDetailFields,"crm.requisite.bankdetail.update"),1);
        $updateRq = json_decode(bx24CallMethod($fields,"crm.requisite.update"),1);
        if($updateRq){
            return $rqId;
        }
    }else{
        $updateRq = json_decode(bx24CallMethod($fields,"crm.requisite.update"),1);
        if($updateRq){
            return $rqId;
        }
    }


}


function bindCompanyToDeal($deal, $companyId, $companyName, $inn,$gnkEntity)
{
    $arDataGnk = $gnkEntity["data"];
    $directorBio = $arDataGnk["gnk_company_director_name"];
    $directorBio = $directorBio?explode(" ",$directorBio):"";
    $companyName = $companyName ?? $arDataGnk["gnk_company_name_full"];
    $objFields = [
        "id" => $deal["ID"],
        "fields" => [
            "COMPANY_ID"  =>  $companyId, 
            "UF_CRM_1700752927154" => "true",
            "UF_CRM_1682675196598"  =>  $arDataGnk["gnk_company_address"],// адресс
            "UF_CRM_1668149033260"  =>  $arDataGnk["company_tin"],// ИНН 
            "UF_CRM_1682671193275"  =>  $arDataGnk["gnk_company_oked"],// окэд 
            "UF_CRM_1690201652156"  =>  $directorBio[1],// имя директора 
            "UF_CRM_1690201671473"  =>  $directorBio[0],// фамилия директора 
        ]
    ];
    
    /**
     * Не заполняем  следущие поля:
     *    Расчетный счет, мфо, название банка.
     * При условии, что :
     *  - Сделка относится к одной из двух воронок ( FINTECH 28, FINTECH Сопровождение 66)
     *  - В поле "Я обновил реквизиты"(UF_CRM_IS_RQ_UPDATED) стоит галочка (true)
    */
    if( $deal["UF_CRM_IS_RQ_UPDATED"] == "0" && ($deal["CATEGORY_ID"] != "50" || $deal["CATEGORY_ID"] != "28" || $deal["CATEGORY_ID"] != "66"))
    {
        $objFields["UF_CRM_1682671131552"] = $arDataGnk["gnk_company_account"]; // рс 
        $objFields["UF_CRM_1682671206730"] = $arDataGnk["gnk_company_mfo"]; // мфо 
    }

    $dealUpdate = json_decode(bx24CallMethod($objFields,"crm.deal.update"),1);
    if($dealUpdate){
        $fields = [
            "fields" => [
                "ENTITY_ID"  => $deal["ID"],
                "ENTITY_TYPE" => "deal",
                "COMMENT" => `Компания была заменена. При необходимости удалите предыдущую - <a href="https://bitrix.uzum.com/crm/company/details/$companyId/">$companyName</a>.`
            ]
        ];
        $commentAdd = json_decode(bx24CallMethod($objFields,"crm.timeline.comment.add"),1);
        if($commentAdd){
            return true;
        }else{
            return true;
        }
    }
    
}

function setCheckedToEntity($dealId)
{
    $fields = [
        "id" => $dealId,
        "fields" => [
            "UF_CRM_1700752927154" => "",
            "UF_CRM_1668149033260" => "",
            "UF_CRM_APP_CPV_FIELD" => "",
        ],
        "params" => ["REGISTER_SONET_EVENT"=>"N"]
    ];
    $updateResult = json_decode(bx24CallMethod($fields,"crm.deal.update"),1);
    return $updateResult ? true : false; 
}

function checkReq( $inn)
{
    $fields = [
        "filter" => [
            "RQ_INN" => $inn
        ],
        "select" => ["ID","ENTITY_ID","RQ_INN"]
    ];
    $getRq = json_decode(bx24CallMethod($fields,"crm.requisite.list"),1);
    if(count($getRq["result"])){
        return false;
    }else{
        return true;
    }
}

function getEntityGnk($inn)
{
    $token = json_decode($_SESSION["MULTIBANK_API_TOKEN"],1);
    $url = 'https://api.multibank.uz/api/check_contragent/v1/gnk/'.$inn.'?refresh=1';
    $httpClient = new HttpClient();
    $httpClient->setHeader('Content-Type', 'application/json');
    // $httpClient->setHeader("Authorization", "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4IiwianRpIjoiZWM3NjIyNTNhNjJiMWI4NDU3NzFjYjNmYmRiY2I4YzQzMWU1NWNmM2FjNDI2OTQ5YjJmODgxNTE5ZWQ1NTVjNmNkNmExOWIwOTcxODRhMGIiLCJpYXQiOjE3MDU5MTg5NTIuODc0MTAxLCJuYmYiOjE3MDU5MTg5NTIuODc0MTAyLCJleHAiOjE3MDYwMDUzNTIuODY4OTAyLCJzdWIiOiI1ZTFjOWI3ZS0xOThkLTRkYTQtOWQyOC1lMmMyYTkzZGVlN2EiLCJzY29wZXMiOltdfQ.HCnmRRNHR9AxO88pfKznjBMQACVB8BEYgYA01Kvb1jZdyG5h0IK03FNFsJjr305Wj0uXfwXLUrKHfQLLlpIVwKrSDybU_5Uq1qvqKJtiIOLn7g5MnrMaXyMQv4KpsNwjB_BGnEprJ_WVz5PD6iT2DVx4jpGDyq36mMGvV-IIiKeJN_FG-4VM7kcf6Au2AGG6n9LmVMe_X3rENmMOotBvDdaIlMx_TT670xjanargzPpYIIS-HyCs1ObEtytwDEOrZ44WFtB8QFJEI9Xx_IgEBUV-_Mhm7rf9MfqIUJg3WoCRhVU03SA3J8AbxLttj_BbZPF4wYK8oV0LPMpHGbQXaz4ticCMj7zs5u83fekvII7Das5HVMvwQ3ByLz5Dfdgcu79dInhVK21KTkRzHDrku0drykNXMlrcTIHpDRIE041sN7fzA_JKOpAkzpaCwexr1Tpsd-d1JPmEanl_CBLHlUaKCwjHhERCgwzIU3W85lAqGgvM9rchdQkoMTYLHk3nEFAXhK2dveuy6c0_PKWMneaJ2BN5T_ANrGqaZM84fOOyl7Zjm7Klv13KtNLjFXCAd3L9jIpjVBEaYccA30ZXYOF_weA0EmmGtMfhgmtYvj98rllMTM64NU_py0k6Fqs_tWxEBEFI9G5mtX0PIAjI8fCiZYP0pBEjFG46SvNI_tg");
    $httpClient->setHeader("Authorization", "Bearer " . $token["access_token"]);
    $responseJson = $httpClient->get($url);
    $response = json_decode($responseJson,1);
    if($response["success"]){
        return $response;
    }else{ 
        // echo '<pre>'; print_r($responseJson); echo '</pre>';
        return $response;
    }
}

function getAuthToken()
{
    if(!$_SESSION["MULTIBANK_API_TOKEN"]){
        $url = 'https://auth.multibank.uz/oauth/token';
        $httpClient = new HttpClient();
        $httpClient->setHeader('Content-Type', 'application/json');
        $response = $httpClient->post($url, json_encode(
            array(
                'grant_type' => 'password',
                'client_id' => '8',
                'client_secret' => 'kV6eVfCQ1u1iVR6Def4K5mMQc9M1NG5t9PS4K1IJ',
                'scope' => '',
                'username' => 'a.naumchuk@uzum.com',
                'password' => 'q7ZKrnkgPouy'
            ),
        ));
        if($response)
        {
            $_SESSION["MULTIBANK_API_TOKEN"] = $response;
        }
    }
}

function bx24CallMethod($fields,$method){
    $url = 'https://bitrix.uzum.com/rest/250548/pax76qsk6jzhk6m9/' . $method;
    $httpClient = new HttpClient();
    $httpClient->setHeader('Content-Type', 'application/json');
    $response = $httpClient->post($url, json_encode($fields));
    return $response;
}
function LogAddTest($result, $comment){
    $html = '\-------' . $comment . "---------\n";
    $html .= print_r($result, true);
    $html .= "\n" . date("d.m.Y H:i:s") . "\n--------------------\n\n\n";
    $file = $_SERVER["DOCUMENT_ROOT"] . "/dev/log_update_result.txt";
    $old_data = file_get_contents($file);
    file_put_contents($file, $html . $old_data);
}
initAutoUpdate();