<?php

/**
 * Файл запускается по крону, предназначен только для тех порталов которые установили приложение локально   
 * Скрипт проверяет все компании у которых есть реквизиты и у которых есть ИНН в поле UF_CRM_CHECK_CONTRAGENTS
 * Скрипт проверяет есть ли у компании реквизиты, если есть то обновляет их, если нет то создает новые
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
    $company_sync_info = $appOption["crm_company_sync_info"];

    // CRest::setLog($appOption, 'crm_company_sync_info');
    if(!$company_sync_info)
    {
        return;
    }
    
    $companyList = CRest::call("crm.company.list", [
        "filter" => [
            ">ID" => $company_sync_info["last_company_id"],
            "<UF_CRM_CHECK_CONTRAGENTS" => "9",
        ],
        "select" => ["ID", "TITLE", "UF_CRM_CHECK_CONTRAGENTS"]
    ]);

    if( !empty($companyList["result"]) && $companyList["total"] != 0)
    {
        start_sync_process($appOption, $company_sync_info, $companyList);
    }
    // если нет компаний но есть последняя синхронизация, то обнуляем и запускаем заново
    else if($companyList["total"] == 0 && $company_sync_info["last_company_id"] != 0 && $offset == 0)
    {
        $company_sync_info["last_company_id"] = 0;
        $company_sync_info["update_at"] = (new DateTime())->format('d.m.Y H:i:s');
        CRest::call(
            'app.option.set',
            [
                'crm_company_sync_info' => $company_sync_info
            ]
        );
        init(1);
    }
    else
    {
        $company_sync_info["last_company_id"] = 0;
        $company_sync_info["update_at"] = (new DateTime())->format('d.m.Y H:i:s');
        CRest::call(
            'app.option.set',
            [
                'crm_company_sync_info' => $company_sync_info
            ]
        );
    }    
}

function start_sync_process($appOption, $company_sync_info, $companyList)
{
    foreach ($companyList["result"] as $key => $company)
    {
        if( isset($company["UF_CRM_CHECK_CONTRAGENTS"]) && !empty($company["UF_CRM_CHECK_CONTRAGENTS"]) )
        {    
            $inn = $company["UF_CRM_CHECK_CONTRAGENTS"];
            $companyId = $company["ID"];
            if (CRest::validateInn($inn)) {
                $rqFilter = [
                    "RQ_INN" => $inn,
                    "ENTITY_TYPE_ID" => 4
                ];
    
                $companyGNK = CRest::getCompanyByTinGNK($inn, $appOption["multibank_auth"]);
                if($companyGNK["success"] && !empty($companyGNK["data"]))
                {
                    $requisite_response = CRest::call("crm.requisite.list", [ "filter" => $rqFilter, "select" => [ "ID", "NAME","RQ_COMPANY_NAME","ENTITY_ID","RQ_INN" ] ]);
                    
                    // Сперва ищем в CRM реквизиты
                    if(!empty($requisite_response["result"][0]))
                    {
                        $requisite_response = $requisite_response["result"][0];
                        if($requisite_response["ENTITY_ID"] == $companyId)
                        {    
                            $updateCompanyRes = CRest::updateCompany( $companyId, $companyGNK, $inn, $requisite_response["ID"], );
                            if($updateCompanyRes["compeny_res"] && $updateCompanyRes["compeny_res"]["result"])
                            {
                                $company_sync_info["count"] = (int)$company_sync_info["count"] + 1;
                                $company_sync_info["last_company_id"] = $companyId;
                                $company_sync_info["update_at"] = (new DateTime())->format('d.m.Y H:i:s');
                                CRest::call(
                                    'app.option.set',
                                    [
                                        'crm_company_sync_info' => $company_sync_info
                                    ]
                                );
                            }
                        }
    
                    // Если нет, то создаем свежую и привязываем
                    }else{
                        // прежде чем создать, провериим есть ли у компании реквизиты
                        $requisite_response = CRest::call("crm.requisite.list", [ "filter" => [
                            "ENTITY_ID" => $companyId,
                            "ENTITY_TYPE_ID" => 4
                        ], "select" => [ "ID", "NAME","RQ_COMPANY_NAME","ENTITY_ID","RQ_INN" ] ]);
                        
                        $requisite_id = false;
                        if(!empty($requisite_response["result"]) && !empty($requisite_response["result"][0]))
                        {
                            $requisite_id = $requisite_response["result"][0]["ID"];
                            continue;
                        }
                        // если есть, то обновляем, если нет то создаем для нее новые
                        $requisite_response = $requisite_response["result"][0];
                        $updateCompanyRes = CRest::updateCompany( $companyId, $companyGNK, $inn, $requisite_id );

                        if($updateCompanyRes["compeny_res"] && $updateCompanyRes["compeny_res"]["result"])
                        {
                            $company_sync_info["count"] = (int)$company_sync_info["count"] + 1;
                            $company_sync_info["last_company_id"] = $companyId;
                            $company_sync_info["update_at"] = (new DateTime())->format('d.m.Y H:i:s');
                            CRest::call(
                                'app.option.set',
                                [
                                    'crm_company_sync_info' => $company_sync_info
                                ]
                            );
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