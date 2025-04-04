<?php

/**
 * Файл запускается по крону, предназначен только для тех порталов которые установили приложение локально 
 * Скрипт проверяет сделки в которых есть ИНН и которые не привязаны к компании
 * Если сделка не привязана к компании, то проверяет есть ли реквизиты в CRM
 * Если реквизиты есть, то привязывает компанию к сделке
 * Если реквизитов нет, то создает компанию и привязывает к сделке
 *  
*/ 

// error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

$_SERVER["DOCUMENT_ROOT"] = "/home/bitrix/www";

define('BX_CRONTAB_SUPPORT', true);

define("NO_KEEP_STATISTIC", true);
define("NOT_CHECK_PERMISSIONS", true);
define('CHK_EVENT', true);

// ini_set('max_execution_time', 3600);
// ini_set('session.gc_maxlifetime', 3600);
// ini_set('session.cookie_lifetime', 3600);

require_once( $_SERVER["DOCUMENT_ROOT"] . '/local/dev/check.contragents.app/src/crest.php');

function init( $offset = 0)
{ 
    $appOption = CRest::call(
        'app.option.get',
        []
    );
    
    $appOption = $appOption["result"];

    $deal_sync_info = $appOption["crm_deal_sync_info"];
    
    $dealList = CRest::call("crm.deal.list", [
        "filter" => [
            ">ID" => $deal_sync_info["last_deal_id"],
            "<UF_CRM_CHECK_CONTRAGENTS" => "9",
            "COMPANY_ID" => "null",
            "CATEGORY_ID" => "3",
        ],
        "select" => ["ID", "TITLE", "UF_CRM_CHECK_CONTRAGENTS", "COMPANY_ID", "CATEGORY_ID"]
    ]);
    
    if( !empty($dealList["result"]) && $dealList["total"] != 0)
    {
        start_sync_process($appOption, $deal_sync_info, $dealList);
    }
    // если нет сделок но есть последняя синхронизация, то обнуляем и запускаем заново
    else if($dealList["total"] == 0 && $deal_sync_info["last_deal_id"] != 0 && $offset == 0)
    {
        $deal_sync_info["last_deal_id"] = 0;
        $deal_sync_info["update_at"] = (new DateTime())->format('d.m.Y H:i:s');
        CRest::call(
            'app.option.set',
            [
                'crm_deal_sync_info' => $deal_sync_info
            ]
        );
        init(1);
    }
    else
    {
        $deal_sync_info["last_deal_id"] = 0;
        $deal_sync_info["update_at"] = (new DateTime())->format('d.m.Y H:i:s');
        CRest::call(
            'app.option.set',
            [
                'crm_deal_sync_info' => $deal_sync_info
            ]
        );
    }    
}

function start_sync_process($appOption, $deal_sync_info, $dealList)
{
    foreach ($dealList["result"] as $key => $deal)
    {
        if( isset($deal["UF_CRM_CHECK_CONTRAGENTS"]) && !empty($deal["UF_CRM_CHECK_CONTRAGENTS"]) )
        {    
            $inn = $deal["UF_CRM_CHECK_CONTRAGENTS"];
            $dealId = $deal["ID"];
            if (CRest::validateInn($inn)) {
                $rqFilter = [
                    "RQ_INN" => $inn,
                    "ENTITY_TYPE_ID" => 4
                ];
    
                $companyGNK = CRest::getCompanyByTinGNK($inn, $appOption["multibank_auth"]);
                if($companyGNK["success"] && !empty($companyGNK["data"])){
    
                    $crmReqsList = CRest::call("crm.requisite.list", [ "filter" => $rqFilter, "select" => [ "ID", "NAME","RQ_COMPANY_NAME","ENTITY_ID","RQ_INN" ] ]);
                    // Сперва ищем в CRM реквизиты
                    if(!empty($crmReqsList["result"][0]))
                    {
                        $deal["STATUS"] = "Привязка компании";
                        $crmReqsData = $crmReqsList["result"][0];
                        // список контактов которые нужно привзяать к сделке
                        $arContacts = CRest::getCompanyBindedContacts($crmReqsData["ENTITY_ID"]);
                        $arContactsIds = array_column($arContacts, 'CONTACT_ID');                        ;

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

                        !empty($arContactsIds) ? $arUpdDealFields["CONTACT_IDS"] = $arContactsIds : false;
    
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
                            
                            $deal_sync_info["count"] = (int)$deal_sync_info["count"] + 1;
                            $deal_sync_info["last_deal_id"] = $dealId;
                            $deal_sync_info["update_at"] = (new DateTime())->format('d.m.Y H:i:s');
                            CRest::call(
                                'app.option.set',
                                [
                                    'crm_deal_sync_info' => $deal_sync_info
                                ]
                            );
    
                            if($crmCompanyByID && !empty($crmCompanyByID["result"]))
                            {

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
                        $deal["STATUS"] = "Создание компании";
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
                                
                                $deal_sync_info["count"] = (int)$deal_sync_info["count"] + 1;
                                $deal_sync_info["last_deal_id"] = $dealId;
                                $deal_sync_info["update_at"] = (new DateTime())->format('d.m.Y H:i:s');
                                CRest::call(
                                    'app.option.set',
                                    [
                                        'crm_deal_sync_info' => $deal_sync_info
                                    ]
                                );

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
}

function Logs($result, $comment, $fileName){
    $html = '\-------'.$comment."---------\n";
    $html.= print_r($result,true);
    $html.="\n".date("d.m.Y H:i:s")."\n--------------------\n\n\n";
    $file= $_SERVER["DOCUMENT_ROOT"]."/local/dev/check.contragents.app/logs/$fileName.txt";
    $old_data=file_get_contents($file);
    file_put_contents($file, $html.$old_data);
}

init();