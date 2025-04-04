<?php

/**
 * Файл для обработки событий CRM
 * Так как приложение изначально разрабатывалось для одного портала, здесь используется пользовательские свойства 
 * и другие специфические вещи, которые могут отличаться в других порталах
 * 
*/

require_once('../src/crest.php');

function Logs($result, $comment, $fileName){
    $html = '\-------'.$comment."---------\n";
    $html.= print_r($result,true);
    $html.="\n".date("d.m.Y H:i:s")."\n--------------------\n\n\n";
    $file=$_SERVER["DOCUMENT_ROOT"]."/local/dev/check.contragents.app/logs/$fileName.txt";
    $old_data=file_get_contents($file);
    file_put_contents($file, $html.$old_data);
}

$input_data_json = file_get_contents("php://input");
$input_data = json_decode($input_data_json,1);

if( 
    isset($_REQUEST["event"]) &&
    $_REQUEST["event"] === "ONCRMDEALADD" &&
    !empty($_REQUEST["data"]["FIELDS"]["ID"]) &&
    $_REQUEST["data"]["FIELDS"]["ID"] > 0
){
    $dealId = $_REQUEST["data"]["FIELDS"]["ID"];
    $dealList = CRest::call("crm.deal.list", [ "filter" => ["ID" => $dealId], "select" => ["ID", "TITLE", "UF_CRM_CHECK_CONTRAGENTS"] ]);
    
    if(!empty($dealList["result"][0])){
        $deal = $dealList["result"][0];
        if( isset($deal["UF_CRM_CHECK_CONTRAGENTS"]) && !empty($deal["UF_CRM_CHECK_CONTRAGENTS"]) ){
            
            $inn = $deal["UF_CRM_CHECK_CONTRAGENTS"];
            if (CRest::validateInn($inn)) {
                $rqFilter = [
                    "RQ_INN" => $inn,
                    "ENTITY_TYPE_ID" => 4
                ];

                $appOption = CRest::call(
                    'app.option.get',
                    []
                );
                
                $companyGNK = CRest::getCompanyByTinGNK($inn, $appOption["multibank_auth"]);
                
                if($companyGNK["success"] && !empty($companyGNK["data"])){

                    $crmReqsList = CRest::call("crm.requisite.list", [ "filter" => $rqFilter, "select" => [ "ID", "NAME","RQ_COMPANY_NAME","ENTITY_ID","RQ_INN" ] ]);

                    // Сперва ищем в CRM реквизиты
                    if(!empty($crmReqsList["result"][0]))
                    {
                        $crmReqsData = $crmReqsList["result"][0];
                        $directorBio = $companyGNK["data"]["gnk_company_director_name"] ? explode(" ", $companyGNK["data"]["gnk_company_director_name"]) : false ;

                        $arUpdDealFields = [
                            "COMPANY_ID" => $crmReqsData["ENTITY_ID"], // Компания
                            "UF_CRM_1732280369451" => "" , // Банковские реквизиты
                            "UF_CRM_1732280375361" => $companyGNK["data"]["gnk_company_address"], // Юр. адрес компании
                            "UF_CRM_1732280382385" => $companyGNK["data"]["gnk_company_account"], // Расчетный счет в банке
                            "UF_CRM_1732280387561" => "", // Название банка
                            "UF_CRM_1732280392608" => $companyGNK["data"]["gnk_company_mfo"], // МФО
                            "UF_CRM_1732280399368" => $companyGNK["data"]["gnk_company_oked"], // ОКЭД
                            "UF_CRM_1732280407535" => $directorBio ? $directorBio[0]: "", // Фамилия директора
                            "UF_CRM_1732280414071" => $directorBio ? $directorBio[1]: "", // Имя директора
                            "UF_CRM_1732280420925" => $companyGNK["data"]["gnk_status_name"], // Статус плательщика НДС
                        ];

                        $dealUpdRes = CRest::call("crm.deal.update", [
                            "ID" => $dealId,
                            "FIELDS" => $arUpdDealFields,
                            'PARAMS' => [
                                'REGISTER_SONET_EVENT' => 'Y',
                            ],
                        ]);

                        if($dealUpdRes){
                            $crmCompanyByID = CRest::call("crm.company.get", [
                                "ID" => $crmReqsData["ENTITY_ID"],
                            ]);

                            if($crmCompanyByID && !empty($crmCompanyByID["result"])){

                                $timelineCommentAdd = CRest::call("crm.timeline.comment.add", [
                                    "fields" => [
                                        "ENTITY_ID" => $dealId,
                                        "ENTITY_TYPE" => "deal",
                                        "COMMENT" => "Компания была заменена. При необходимости удалите предыдущую - <a href=\"https://b24.alphacon.uz/crm/company/details/" . $crmReqsData["ENTITY_ID"] . "/\" > " . $crmCompanyByID["result"]["TITLE"] . " </a>."
                                    ]
                                ]);
                            }
                        }

                    // Если нет, то создаем свежую и привязываем
                    }else{
                        
                        $newCompanyWithRq = CRest::createCompany( $companyGNK, $inn );
                        if($newCompanyWithRq["compeny_res"] && $newCompanyWithRq["compeny_res"]["result"])
                        {
                            $directorBio = $companyGNK["data"]["gnk_company_director_name"] ? explode(" ", $companyGNK["data"]["gnk_company_director_name"]) : false ;
    
                            $arUpdDealFields = [
                                "COMPANY_ID" => $newCompanyWithRq["compeny_res"]["result"], // Компания
                                "UF_CRM_1732280369451" => "" , // Банковские реквизиты
                                "UF_CRM_1732280375361" => $companyGNK["data"]["gnk_company_address"], // Юр. адрес компании
                                "UF_CRM_1732280382385" => $companyGNK["data"]["gnk_company_account"], // Расчетный счет в банке
                                "UF_CRM_1732280387561" => "", // Название банка
                                "UF_CRM_1732280392608" => $companyGNK["data"]["gnk_company_mfo"], // МФО
                                "UF_CRM_1732280399368" => $companyGNK["data"]["gnk_company_oked"], // ОКЭД
                                "UF_CRM_1732280407535" => $directorBio ? $directorBio[0]: "", // Фамилия директора
                                "UF_CRM_1732280414071" => $directorBio ? $directorBio[1]: "", // Имя директора
                                "UF_CRM_1732280420925" => $companyGNK["data"]["gnk_status_name"], // Статус плательщика НДС
                            ];
    
                            $dealUpdRes = CRest::call("crm.deal.update", [
                                "ID" => $dealId,
                                "FIELDS" => $arUpdDealFields,
                                'PARAMS' => [
                                    'REGISTER_SONET_EVENT' => 'Y',
                                ],
                            ]);
    
                            if($dealUpdRes){
                                $crmCompanyByID = CRest::call("crm.company.get", [
                                    "ID" => $newCompanyWithRq["compeny_res"]["result"],
                                ]);
    
                                if($crmCompanyByID && !empty($crmCompanyByID["result"])){
    
                                    $timelineCommentAdd = CRest::call("crm.timeline.comment.add", [
                                        "fields" => [
                                            "ENTITY_ID" => $dealId,
                                            "ENTITY_TYPE" => "deal",
                                            "COMMENT" => "Компания была заменена. При необходимости удалите предыдущую - <a href=\"https://b24.alphacon.uz/crm/company/details/" . $crmReqsData["ENTITY_ID"] . "/\" > " . $crmCompanyByID["result"]["TITLE"] . " </a>."
                                        ]
                                    ]);
                                }
                            }
                        }
                    } 

                    $crmReqsList["DEAL_ID"] = $deal["ID"];
                    // Logs($crmReqsList, "__crmReqsList__", "app_handler");
                }else{
                    Logs($companyGNK, "__companyGNK__", "app_handler");
                }            

            }
        }

    }else{
        echo '<pre>'; print_r($dealList); echo '</pre>';
    }
}

if( 
    isset($_REQUEST["event"]) &&
    $_REQUEST["event"] === "ONCRMDEALUPDATE" &&
    !empty($_REQUEST["data"]["FIELDS"]["ID"]) &&
    $_REQUEST["data"]["FIELDS"]["ID"] > 0
){
    $dealId = $_REQUEST["data"]["FIELDS"]["ID"];
    $dealList = CRest::call("crm.deal.list", [ "filter" => ["ID" => $dealId], "select" => ["ID", "TITLE", "UF_CRM_CHECK_CONTRAGENTS", "COMPANY_ID"] ]);
    
    if(!empty($dealList["result"][0]))
    {
        $deal = $dealList["result"][0];
        if( isset($deal["UF_CRM_CHECK_CONTRAGENTS"]) && !empty($deal["UF_CRM_CHECK_CONTRAGENTS"]) )
        {    
            $inn = $deal["UF_CRM_CHECK_CONTRAGENTS"];
            if (CRest::validateInn($inn)) {
                $rqFilter = [
                    "RQ_INN" => $inn,
                    "ENTITY_TYPE_ID" => 4
                ];
                
                $appOption = CRest::call(
                    'app.option.get',
                    []
                );
                $companyGNK = CRest::getCompanyByTinGNK($inn, $appOption["multibank_auth"]);
                if($companyGNK["success"] && !empty($companyGNK["data"])){

                    $crmReqsList = CRest::call("crm.requisite.list", [ "filter" => $rqFilter, "select" => [ "ID", "NAME","RQ_COMPANY_NAME","ENTITY_ID","RQ_INN" ] ]);

                    // Сперва ищем в CRM реквизиты
                    if(!empty($crmReqsList["result"][0]))
                    {
                        $crmReqsData = $crmReqsList["result"][0];
                        if($crmReqsData["ENTITY_ID"] == $deal["COMPANY_ID"])
                        {
                            return;
                        }

                        $directorBio = $companyGNK["data"]["gnk_company_director_name"] ? explode(" ", $companyGNK["data"]["gnk_company_director_name"]) : false ;
                        
                        $arUpdDealFields = [
                            "COMPANY_ID" => $crmReqsData["ENTITY_ID"], // Компания
                            "UF_CRM_1732280369451" => "" , // Банковские реквизиты
                            "UF_CRM_1732280375361" => $companyGNK["data"]["gnk_company_address"], // Юр. адрес компании
                            "UF_CRM_1732280382385" => $companyGNK["data"]["gnk_company_account"], // Расчетный счет в банке
                            "UF_CRM_1732280387561" => "", // Название банка
                            "UF_CRM_1732280392608" => $companyGNK["data"]["gnk_company_mfo"], // МФО
                            "UF_CRM_1732280399368" => $companyGNK["data"]["gnk_company_oked"], // ОКЭД
                            "UF_CRM_1732280407535" => $directorBio ? $directorBio[0]: "", // Фамилия директора
                            "UF_CRM_1732280414071" => $directorBio ? $directorBio[1]: "", // Имя директора
                            "UF_CRM_1732280420925" => $companyGNK["data"]["gnk_status_name"], // Статус плательщика НДС
                        ];

                        $dealUpdRes = CRest::call("crm.deal.update", [
                            "ID" => $dealId,
                            "FIELDS" => $arUpdDealFields,
                            'PARAMS' => [
                                'REGISTER_SONET_EVENT' => 'Y',
                            ],
                        ]);

                        if($dealUpdRes){
                            $crmCompanyByID = CRest::call("crm.company.get", [
                                "ID" => $crmReqsData["ENTITY_ID"],
                            ]);

                            if($crmCompanyByID && !empty($crmCompanyByID["result"])){

                                $timelineCommentAdd = CRest::call("crm.timeline.comment.add", [
                                    "fields" => [
                                        "ENTITY_ID" => $dealId,
                                        "ENTITY_TYPE" => "deal",
                                        "COMMENT" => "Компания была заменена. При необходимости удалите предыдущую - <a href=\"https://b24.alphacon.uz/crm/company/details/" . $crmReqsData["ENTITY_ID"] . "/\" > " . $crmCompanyByID["result"]["TITLE"] . " </a>."
                                    ]
                                ]);
                            }
                        }

                    // Если нет, то создаем свежую и привязываем
                    }else{
                        
                        $newCompanyWithRq = CRest::createCompany( $companyGNK, $inn );
                        if($newCompanyWithRq["compeny_res"] && $newCompanyWithRq["compeny_res"]["result"])
                        {
                            $directorBio = $companyGNK["data"]["gnk_company_director_name"] ? explode(" ", $companyGNK["data"]["gnk_company_director_name"]) : false ;
    
                            $arUpdDealFields = [
                                "COMPANY_ID" => $newCompanyWithRq["compeny_res"]["result"], // Компания
                                "UF_CRM_1732280369451" => "" , // Банковские реквизиты
                                "UF_CRM_1732280375361" => $companyGNK["data"]["gnk_company_address"], // Юр. адрес компании
                                "UF_CRM_1732280382385" => $companyGNK["data"]["gnk_company_account"], // Расчетный счет в банке
                                "UF_CRM_1732280387561" => "", // Название банка
                                "UF_CRM_1732280392608" => $companyGNK["data"]["gnk_company_mfo"], // МФО
                                "UF_CRM_1732280399368" => $companyGNK["data"]["gnk_company_oked"], // ОКЭД
                                "UF_CRM_1732280407535" => $directorBio ? $directorBio[0]: "", // Фамилия директора
                                "UF_CRM_1732280414071" => $directorBio ? $directorBio[1]: "", // Имя директора
                                "UF_CRM_1732280420925" => $companyGNK["data"]["gnk_status_name"], // Статус плательщика НДС
                            ];
    
                            $dealUpdRes = CRest::call("crm.deal.update", [
                                "ID" => $dealId,
                                "FIELDS" => $arUpdDealFields,
                                'PARAMS' => [
                                    'REGISTER_SONET_EVENT' => 'Y',
                                ],
                            ]);
    
                            if($dealUpdRes){
                                $crmCompanyByID = CRest::call("crm.company.get", [
                                    "ID" => $newCompanyWithRq["compeny_res"]["result"],
                                ]);
    
                                if($crmCompanyByID && !empty($crmCompanyByID["result"])){
    
                                    $timelineCommentAdd = CRest::call("crm.timeline.comment.add", [
                                        "fields" => [
                                            "ENTITY_ID" => $dealId,
                                            "ENTITY_TYPE" => "deal",
                                            "COMMENT" => "Компания была заменена. При необходимости удалите предыдущую - <a href=\"https://b24.alphacon.uz/crm/company/details/" . $crmReqsData["ENTITY_ID"] . "/\" > " . $crmCompanyByID["result"]["TITLE"] . " </a>."
                                        ]
                                    ]);
                                }
                            }
                        }
                    } 
                }            

            }
        }
    }
    // $dealList = CRest::call("crm.deal.list", [ "filter" => ["ID" => $dealId], "select" => ["ID", "TITLE", "UF_CRM_CHECK_CONTRAGENTS"] ]);
}



