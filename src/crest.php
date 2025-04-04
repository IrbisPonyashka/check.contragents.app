<?php
	/**
	 * Класс не расчитан на тиражное использование
	*/
	
	require_once (__DIR__.'/settings.php');

	/**
	 *  @version 1.33
	 *  define:
	 *      C_REST_WEB_HOOK_URL = 'https://rest-api.bitrix24.com/rest/1/doutwqkjxgc3mgc1/'  //url on creat Webhook
	 *      or
	 *      C_REST_CLIENT_ID = 'local.5c8bb1b0891cf2.87252039' //Application ID
	 *      C_REST_CLIENT_SECRET = 'SakeVG5mbRdcQet45UUrt6q72AMTo7fkwXSO7Y5LYFYNCRsA6f'//Application key
	 *
	 *		C_REST_CURRENT_ENCODING = 'windows-1251'//set current encoding site if encoding unequal UTF-8 to use iconv()
	 *      C_REST_BLOCK_LOG = true //turn off default logs
	 *      C_REST_LOGS_DIR = __DIR__ .'/logs/' //directory path to save the log
	 *      C_REST_LOG_TYPE_DUMP = true //logs save var_export for viewing convenience
	 *      C_REST_IGNORE_SSL = true //turn off validate ssl by curl
	 */
 
	class CRest
	{
		const BATCH_COUNT    = 50;//count batch 1 query
		const TYPE_TRANSPORT = 'json';// json or xml

		/**
		 * call where install application even url
		 * only for rest application, not webhook
		 */

		public static function installApp()
		{
			$result = [
				'rest_only' => true,
				'install' => false
			];
			if($_REQUEST[ 'event' ] == 'ONAPPINSTALL' && !empty($_REQUEST[ 'auth' ]))
			{
				$result['install'] = static::setAppSettings($_REQUEST[ 'auth' ], true);
			}
			elseif($_REQUEST['PLACEMENT'] == 'DEFAULT')
			{
				$result['rest_only'] = false;
				$result['install'] = static::setAppSettings(
					[
						'access_token' => htmlspecialchars($_REQUEST['AUTH_ID']),
						'expires_in' => htmlspecialchars($_REQUEST['AUTH_EXPIRES']),
						'application_token' => htmlspecialchars($_REQUEST['APP_SID']),
						'refresh_token' => htmlspecialchars($_REQUEST['REFRESH_ID']),
						'domain' => htmlspecialchars($_REQUEST['DOMAIN']),
						'client_endpoint' => 'https://' . htmlspecialchars($_REQUEST['DOMAIN']) . '/rest/',
					],
					true
				);
			}

			// static::setLog(
			// 	[
			// 		'request' => $_REQUEST,
			// 		'result' => $result
			// 	],
			// 	'installApp'
			// );
			return $result;
		}

		/**
		 * @var $arParams array
		 * $arParams = [
		 *      'method'    => 'some rest method',
		 *      'params'    => []//array params of method
		 * ];
		 * @return mixed array|string|boolean curl-return or error
		 *
		 */
		protected static function callCurl($arParams)
		{
			if(!function_exists('curl_init'))
			{
				return [
					'error'             => 'error_php_lib_curl',
					'error_information' => 'need install curl lib'
				];
			}
			$arSettings = static::getAppSettings();
			if($arSettings !== false)
			{
				if(isset($arParams[ 'this_auth' ]) && $arParams[ 'this_auth' ] == 'Y')
				{
					$url = 'https://oauth.bitrix.info/oauth/token/';
				}
				else
				{
					$url = $arSettings[ "client_endpoint" ] . $arParams[ 'method' ] . '.' . static::TYPE_TRANSPORT;
					if(empty($arSettings[ 'is_web_hook' ]) || $arSettings[ 'is_web_hook' ] != 'Y')
					{
						$arParams[ 'params' ][ 'auth' ] = $arSettings[ 'access_token' ];
					}
				}

				$sPostFields = http_build_query($arParams[ 'params' ]);

				try
				{
					$obCurl = curl_init();
					curl_setopt($obCurl, CURLOPT_URL, $url);
					curl_setopt($obCurl, CURLOPT_RETURNTRANSFER, true);
					if($sPostFields)
					{
						curl_setopt($obCurl, CURLOPT_POST, true);
						curl_setopt($obCurl, CURLOPT_POSTFIELDS, $sPostFields);
					}
					curl_setopt(
						$obCurl, CURLOPT_FOLLOWLOCATION, (isset($arParams[ 'followlocation' ]))
						? $arParams[ 'followlocation' ] : 1
					);
					if(defined("C_REST_IGNORE_SSL") && C_REST_IGNORE_SSL === true)
					{
						curl_setopt($obCurl, CURLOPT_SSL_VERIFYPEER, false);
						curl_setopt($obCurl, CURLOPT_SSL_VERIFYHOST, false);
					}
					$out = curl_exec($obCurl);
					$info = curl_getinfo($obCurl);
					if(curl_errno($obCurl))
					{
						$info[ 'curl_error' ] = curl_error($obCurl);
					}
					if(static::TYPE_TRANSPORT == 'xml' && (!isset($arParams[ 'this_auth' ]) || $arParams[ 'this_auth' ] != 'Y'))//auth only json support
					{
						$result = $out;
					}
					else
					{
						$result = static::expandData($out);
					}
					curl_close($obCurl);

					if(!empty($result[ 'error' ]))
					{
						if($result[ 'error' ] == 'expired_token' && empty($arParams[ 'this_auth' ]))
						{
							$result = static::GetNewAuth($arParams);
						}
						else
						{
							$arErrorInform = [
								'expired_token'          => 'expired token, cant get new auth? Check access oauth server.',
								'invalid_token'          => 'invalid token, need reinstall application',
								'invalid_grant'          => 'invalid grant, check out define C_REST_CLIENT_SECRET or C_REST_CLIENT_ID',
								'invalid_client'         => 'invalid client, check out define C_REST_CLIENT_SECRET or C_REST_CLIENT_ID',
								'QUERY_LIMIT_EXCEEDED'   => 'Too many requests, maximum 2 query by second',
								'ERROR_METHOD_NOT_FOUND' => 'Method not found! You can see the permissions of the application: CRest::call(\'scope\')',
								'NO_AUTH_FOUND'          => 'Some setup error b24, check in table "b_module_to_module" event "OnRestCheckAuth"',
								'INTERNAL_SERVER_ERROR'  => 'Server down, try later'
							];
							if(!empty($arErrorInform[ $result[ 'error' ] ]))
							{
								$result[ 'error_information' ] = $arErrorInform[ $result[ 'error' ] ];
							}
						}
					}
					if(!empty($info[ 'curl_error' ]))
					{
						$result[ 'error' ] = 'curl_error';
						$result[ 'error_information' ] = $info[ 'curl_error' ];
					}

					// static::setLog(
					// 	[
					// 		'url'    => $url,
					// 		'info'   => $info,
					// 		'params' => $arParams,
					// 		'result' => $result
					// 	],
					// 	'callCurl'
					// );

					return $result;
				}
				catch(Exception $e)
				{
					return [
						'error'             => 'exception',
						'error_information' => $e -> getMessage(),
					];
				}
			}
			return [
				'error'             => 'no_install_app',
				'error_information' => 'error install app, pls install local application '
			];
		}

		/**
		 * Generate a request for callCurl()
		 *
		 * @var $method string
		 * @var $params array method params
		 * @return mixed array|string|boolean curl-return or error
		 */

		public static function call($method, $params = [])
		{
			$arPost = [
				'method' => $method,
				'params' => $params
			];
			if(defined('C_REST_CURRENT_ENCODING'))
			{
				$arPost[ 'params' ] = static::changeEncoding($arPost[ 'params' ]);
			}

			$result = static::callCurl($arPost);
			return $result;
		}

		/**
		 * @example $arData:
		 * $arData = [
		 *      'find_contact' => [
		 *          'method' => 'crm.duplicate.findbycomm',
		 *          'params' => [ "entity_type" => "CONTACT",  "type" => "EMAIL", "values" => array("info@bitrix24.com") ]
		 *      ],
		 *      'get_contact' => [
		 *          'method' => 'crm.contact.get',
		 *          'params' => [ "id" => '$result[find_contact][CONTACT][0]' ]
		 *      ],
		 *      'get_company' => [
		 *          'method' => 'crm.company.get',
		 *          'params' => [ "id" => '$result[get_contact][COMPANY_ID]', "select" => ["*"],]
		 *      ]
		 * ];
		 *
		 * @var $arData array
		 * @var $halt   integer 0 or 1 stop batch on error
		 * @return array
		 *
		 */

		public static function callBatch($arData, $halt = 0)
		{
			$arResult = [];
			if(is_array($arData))
			{
				if(defined('C_REST_CURRENT_ENCODING'))
				{
					$arData = static::changeEncoding($arData);
				}
				$arDataRest = [];
				$i = 0;
				foreach($arData as $key => $data)
				{
					if(!empty($data[ 'method' ]))
					{
						$i++;
						if(static::BATCH_COUNT >= $i)
						{
							$arDataRest[ 'cmd' ][ $key ] = $data[ 'method' ];
							if(!empty($data[ 'params' ]))
							{
								$arDataRest[ 'cmd' ][ $key ] .= '?' . http_build_query($data[ 'params' ]);
							}
						}
					}
				}
				if(!empty($arDataRest))
				{
					$arDataRest[ 'halt' ] = $halt;
					$arPost = [
						'method' => 'batch',
						'params' => $arDataRest
					];
					$arResult = static::callCurl($arPost);
				}
			}
			return $arResult;
		}

		/**
		 * Getting a new authorization and sending a request for the 2nd time
		 *
		 * @var $arParams array request when authorization error returned
		 * @return array query result from $arParams
		 *
		 */

		private static function GetNewAuth($arParams)
		{
			$result = [];
			$arSettings = static::getAppSettings();
			if($arSettings !== false)
			{
				$arParamsAuth = [
					'this_auth' => 'Y',
					'params'    =>
						[
							'client_id'     => $arSettings[ 'C_REST_CLIENT_ID' ],
							'grant_type'    => 'refresh_token',
							'client_secret' => $arSettings[ 'C_REST_CLIENT_SECRET' ],
							'refresh_token' => $arSettings[ "refresh_token" ],
						]
				];
				$newData = static::callCurl($arParamsAuth);
				if(isset($newData[ 'C_REST_CLIENT_ID' ]))
				{
					unset($newData[ 'C_REST_CLIENT_ID' ]);
				}
				if(isset($newData[ 'C_REST_CLIENT_SECRET' ]))
				{
					unset($newData[ 'C_REST_CLIENT_SECRET' ]);
				}
				if(isset($newData[ 'error' ]))
				{
					unset($newData[ 'error' ]);
				}
				$newData['application_token'] = $arSettings['application_token'];
				$newData['domain'] = "oauth.bitrix.info";
				if(static::setAppSettings($newData))
				{
					$arParams[ 'this_auth' ] = 'N';
					$result = static::callCurl($arParams);
				}
			}
			return $result;
		}

		/**
		 * @var $arSettings array settings application
		 * @var $isInstall  boolean true if install app by installApp()
		 * @return boolean
		 */

		private static function setAppSettings($arSettings, $isInstall = false)
		{
			$return = false;
			if(is_array($arSettings))
			{
				$oldData = static::getAppSettings();
				if($isInstall != true && !empty($oldData) && is_array($oldData))
				{
					$arSettings = array_merge($oldData, $arSettings);
				}
				$return = static::setSettingData($arSettings);
			}
			return $return;
		}

		/**
		 * @return mixed setting application for query
		 */

		private static function getAppSettings()
		{
			if(defined("C_REST_WEB_HOOK_URL") && !empty(C_REST_WEB_HOOK_URL))
			{
				$arData = [
					'client_endpoint' => C_REST_WEB_HOOK_URL,
					'is_web_hook'     => 'Y'
				];
				$isCurrData = true;
			}
			else
			{
				$arData = static::getSettingData();
			
				$isCurrData = false;
				if(
					!empty($arData[ 'access_token' ]) &&
					!empty($arData[ 'domain' ]) &&
					!empty($arData[ 'refresh_token' ]) &&
					!empty($arData[ 'application_token' ]) &&
					!empty($arData[ 'client_endpoint' ])
				)
				{
					$isCurrData = true;
				}
			}
				
			return ($isCurrData) ? $arData : false;
		}

		/**
		 * Can overridden this method to change the data storage location.
		 *
		 * @return array setting for getAppSettings()
		 */

		protected static function getSettingData()
		{
			$return = [];
			if(file_exists(__DIR__ . '/settings.json'))
			{
				$return = static::expandData(file_get_contents(__DIR__ . '/settings.json'));
				if(defined("C_REST_CLIENT_ID") && !empty(C_REST_CLIENT_ID))
				{
					$return['C_REST_CLIENT_ID'] = C_REST_CLIENT_ID;
				}
				if(defined("C_REST_CLIENT_SECRET") && !empty(C_REST_CLIENT_SECRET))
				{
					$return['C_REST_CLIENT_SECRET'] = C_REST_CLIENT_SECRET;
				}
			}
			return $return;
		}

		/**
		 * @var $data mixed
		 * @var $encoding boolean true - encoding to utf8, false - decoding
		 *
		 * @return string json_encode with encoding
		 */
		protected static function changeEncoding($data, $encoding = true)
		{
			if(is_array($data))
			{
				$result = [];
				foreach ($data as $k => $item)
				{
					$k = static::changeEncoding($k, $encoding);
					$result[$k] = static::changeEncoding($item, $encoding);
				}
			}
			else
			{
				if($encoding)
				{
					$result = iconv(C_REST_CURRENT_ENCODING, "UTF-8//TRANSLIT", $data);
				}
				else
				{
					$result = iconv( "UTF-8",C_REST_CURRENT_ENCODING, $data);
				}
			}

			return $result;
		}

		/**
		 * @var $data mixed
		 * @var $debag boolean
		 *
		 * @return string json_encode with encoding
		 */
		protected static function wrapData($data, $debag = false)
		{
			if(defined('C_REST_CURRENT_ENCODING'))
			{
				$data = static::changeEncoding($data, true);
			}
			$return = json_encode($data, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT);

			if($debag)
			{
				$e = json_last_error();
				if ($e != JSON_ERROR_NONE)
				{
					if ($e == JSON_ERROR_UTF8)
					{
						return 'Failed encoding! Recommended \'UTF - 8\' or set define C_REST_CURRENT_ENCODING = current site encoding for function iconv()';
					}
				}
			}

			return $return;
		}

		/**
		 * @var $data mixed
		 * @var $debag boolean
		 *
		 * @return string json_decode with encoding
		 */
		protected static function expandData($data)
		{
			$return = json_decode($data, true);
			if(defined('C_REST_CURRENT_ENCODING'))
			{
				$return = static::changeEncoding($return, false);
			}
			return $return;
		}

		/**
		 * Can overridden this method to change the data storage location.
		 *
		 * @var $arSettings array settings application
		 * @return boolean is successes save data for setSettingData()
		 */

		protected static function setSettingData($arSettings)
		{
			self::setLog($arSettings, "setSettingData");
			return  (boolean)file_put_contents(__DIR__ . '/settings.json', static::wrapData($arSettings));
		}

		/**
		 * Can overridden this method to change the log data storage location.
		 *
		 * @var $arData array of logs data
		 * @var $type   string to more identification log data
		 * @return boolean is successes save log data
		 */

		public static function setLog($arData, $type = '')
		{
			$return = false;
			if(!defined("C_REST_BLOCK_LOG") || C_REST_BLOCK_LOG !== true)
			{
				if(defined("C_REST_LOGS_DIR"))
				{
					$path = C_REST_LOGS_DIR;
				}
				else
				{
					$path = __DIR__ . '/logs/';
				}
				$path .= date("Y-m-d/H") . '/';
				@mkdir($path, 0775, true);
				$path .= time() . '_' . $type . '_' . rand(1, 9999999) . 'log';
				if(!defined("C_REST_LOG_TYPE_DUMP") || C_REST_LOG_TYPE_DUMP !== true)
				{
					$return = file_put_contents($path . '.json', static::wrapData($arData));
				}
				else
				{
					$return = file_put_contents($path . '.txt', var_export($arData, true));
				}
			}
			return $return;
		}

		/**
		 * check minimal settings server to work CRest
		 * @var $print boolean
		 * @return array of errors
		 */
		public static function checkServer($print = true)
		{
			$return = [];

			//check curl lib install
			if(!function_exists('curl_init'))
			{
				$return['curl_error'] = 'Need install curl lib.';
			}

			//creat setting file
			file_put_contents(__DIR__ . '/settings_check.json', static::wrapData(['test'=>'data']));
			if(!file_exists(__DIR__ . '/settings_check.json'))
			{
				$return['setting_creat_error'] = 'Check permission! Recommended: folders: 775, files: 664';
			}
			unlink(__DIR__ . '/settings_check.json');
			//creat logs folder and files
			$path = __DIR__ . '/logs/'.date("Y-m-d/H") . '/';
			if(!mkdir($path, 0775, true) && !file_exists($path))
			{
				$return['logs_folder_creat_error'] = 'Check permission! Recommended: folders: 775, files: 664';
			}
			else
			{
				file_put_contents($path . 'test.txt', var_export(['test'=>'data'], true));
				if(!file_exists($path . 'test.txt'))
				{
					$return['logs_file_creat_error'] = 'check permission! recommended: folders: 775, files: 664';
				}
				unlink($path . 'test.txt');
			}

			if($print === true)
			{
				if(empty($return))
				{
					$return['success'] = 'Success!';
				}
				echo '<pre>';
				print_r($return);
				echo '</pre>';

			}

			return $return;
		}
		
		public static function validateInn($inn) {		
			// Проверяем, что ИНН состоит только из цифр
			if (!preg_match('/^\d+$/', $inn)) {
				return false;
			}
			
			// Проверяем длину ИНН (9 или 14 символов)
			$length = strlen($inn);
			if ($length !== 9 && $length !== 14) {
				return false;
			}
			
			return true;
		}
		
		
		public static function getPreset($inn)
		{
			$type = strlen($inn) == 9 ? "entity" : "individual";

			$fields = [
				"filter" => [
					"NAME" => $type == "entity" ? "Юридическое лицо" : "Физическое лицо",
				]
			];

			$presetList = static::call("crm.requisite.preset.list",$fields);
			if($presetList["result"]){
				return $presetList["result"][0];
			}else{
				return $presetList;
			}
		}

		private static function requisiteUpdate($companyId, $requisiteId, $inn, $gnkEntity, $type )
		{
			$arDataGnk = $gnkEntity["data"];
			if ($type == "entity") {
				$presetName = "Юр. лицо Узбекистан";
				$presetId = 1;
				$entityTypeId = 4;
			} else {
				$presetName = "ИП";
				$presetId = 2;
				$entityTypeId = 4;
			};

			$directorBio = $arDataGnk["gnk_company_director_name"];
			$directorBio = $directorBio ? explode(" ",$directorBio):"";

			$fields = [
				"ID" => $requisiteId,
				"fields" => [
					"RQ_INN" => $inn,
					"ENTITY_TYPE_ID" => $entityTypeId,
					"ENTITY_ID" => $companyId,
					// "PRESET_ID" => $presetId, //preset.ID,
					"ACTIVE" => "Y",	
					"NAME"  =>  $presetName,
					"RQ_COMPANY_NAME" =>  $arDataGnk["gnk_company_name"],
					"RQ_COMPANY_FULL_NAME" =>  $arDataGnk["gnk_company_name_full"],
					"RQ_DIRECTOR" =>  $arDataGnk["gnk_company_director_name"],
					// "RQ_ACCOUNTANT" =>  $arDataGnk["gnk_company_accountant"],
					// "RQ_OKVED" =>  $arDataGnk["gnk_company_oked"],
					"RQ_PHONE" =>  "",
					"RQ_LAST_NAME" =>   $directorBio[0] ,
					"RQ_FIRST_NAME" =>  $directorBio[1] ,
					"RQ_SECOND_NAME" => $directorBio[2] 
				],
				"params" => [ "REGISTER_SONET_EVENT" => "N" ]	
			];
			$adresFields = [
				"fields" => [
					"TYPE_ID" => 6, 
					"ENTITY_TYPE_ID" => 8, // реквизиты
					"ENTITY_ID" => $requisiteId, // id реквизита
					"ADDRESS_1" => $arDataGnk["gnk_company_address"],
				]
			];
			$bankDetailFields = [
				"fields" => [
					"ENTITY_ID" => '$result[crmRequisiteAdd]', // id реквизита
					"COUNTRY_ID" => 1,
					"NAME" => "Первичный счёт",
					"RQ_BANK_NAME" => $arDataGnk["bank_name"] ?? "",
					"RQ_BIK" => $arDataGnk["gnk_company_mfo"],
					"RQ_ACC_NUM" => $arDataGnk["gnk_company_account"],		
					"RQ_ACC_CURRENCY" => "Узбекский сум",	
				]
			];
			$arData = [
				"crmRequisiteUpdate" => [ "method" => "crm.requisite.update", "params" => $fields ],
				// "crmAdressUpdate" => ["method" =>"crm.address.update","params" => $adresFields],
				// "crmRequisiteBankdetailUpdate" => ["method" =>"crm.requisite.bankdetail.update","params" => $bankDetailFields],
				// "crmRequisiteBankdetailUpdate" => ["method" =>"crm.requisite.bankdetail.update","params" => $bankDetailFields],
			];

			$batch = static::callBatch($arData, 0);
			if($batch["result"]["result"]["crmRequisiteUpdate"]){
				return $batch["result"]["result"]["crmRequisiteUpdate"];
			}else{
				return $batch;
			}
		}

		public static function updateCompany( $companyId, $gnkEntity, $inn, $requisiteId = false )
		{
			$arDataGnk = $gnkEntity["data"];
			$type = strlen($inn) == 9 ? "entity" : "individual";
			
			// $directorBio = $arDataGnk["gnk_company_director_name"];
			// $directorBio = $directorBio ? explode(" ",$directorBio):"";
			
			$fields = [
				"ID" => $companyId,
				"fields" => [
					"TITLE" => $arDataGnk["gnk_company_name_full"],
					"UF_CRM_CHECK_CONTRAGENTS" => $inn, // ИНН
					"UF_CRM_1732280688058" => "", // Банковские реквизиты
					"UF_CRM_1730706873638" => "", // Название банка
					"UF_CRM_1732280758867" => $arDataGnk["gnk_status_name"], // Банковские реквизиты
					"UF_CRM_1730706889624" => $arDataGnk["gnk_company_oked"], // ОКЭД
					// "UF_CRM_1730706896133" => $arDataGnk["gnk_company_mfo"], // МФО
					// "UF_CRM_1730706882227" => $arDataGnk["gnk_company_account"], // Расчетный счет в банке
					// "UF_CRM_1730706901979" => $arDataGnk["gnk_company_address"], // Юр. адрес компании
					"UF_CRM_1732280703903" => $directorBio ? $directorBio[0]: "", // Фамилия директора
					"UF_CRM_1732280711686" => $directorBio ? $directorBio[1]: "", // Имя директора
					"UF_CRM_1730706908545" => $arDataGnk["gnk_company_director_name"] ?? "", // Статус плательщика НДС
				],
				"params" => [ "REGISTER_SONET_EVENT" => "N" ]	
			];
			
			// if($type == "individual"){
			// 	$fields["fields"]["LAST_NAME"] = $directorBio ? $directorBio[0] : "";
			// 	$fields["fields"]["NAME"] = $directorBio ? $directorBio[1] : "";
			// 	$fields["fields"]["SECOND_NAME"] = $directorBio ? $directorBio[2] : "";
			// }

			$updCompany = static::call("crm.company.update", $fields );

			if($updCompany["result"])
			{
				$requisiteUpdate = $requisiteId ?
					static::requisiteUpdate($companyId, $requisiteId, $inn, $gnkEntity, $type )
						: static::requisiteCreate($companyId, $inn, $gnkEntity, $type );

				if($requisiteUpdate["result"][0]) {
					return [
						"compeny_res" => $companyId,
						"requisite_res" => $requisiteUpdate
					];
				}else {
					return [
						"compeny_res" => $updCompany,
						"requisite_res" => $requisiteUpdate
					];
				}
			}
		}

		private static function requisiteCreate($companyId, $inn, $gnkEntity, $type )
		{
			$arDataGnk = $gnkEntity["data"];
			if ($type == "entity") {
				$presetName = "Юр. лицо Узбекистан";
				$presetId = 1;
				$entityTypeId = 4;
			} else {
				$presetName = "ИП";
				$presetId = 2;
				$entityTypeId = 4;
			};

			$directorBio = $arDataGnk["gnk_company_director_name"];
			$directorBio = $directorBio ? explode(" ",$directorBio):"";

			$fields = [
				"fields" => [
					"RQ_INN" => $inn,
					"ENTITY_TYPE_ID" => $entityTypeId,
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
					"TYPE_ID" => 6, 
					"ENTITY_TYPE_ID" => 8, // реквизиты
					"ENTITY_ID" => '$result[crmRequisiteAdd]', // id реквизита
					"ADDRESS_1" => $arDataGnk["gnk_company_address"],
				]
			];
			$bankDetailFields = [
				"fields" => [
					"ENTITY_ID" => '$result[crmRequisiteAdd]', // id реквизита
					"COUNTRY_ID" => 1,
					"NAME" => "Первичный счёт",
					"RQ_BANK_NAME" => $arDataGnk["bank_name"] ?? "",
					"RQ_BIK" => $arDataGnk["gnk_company_mfo"],
					"RQ_ACC_NUM" => $arDataGnk["gnk_company_account"],		
					"RQ_ACC_CURRENCY" => "Узбекский сум",	
				]
			];
			$arData = [
				"crmRequisiteAdd" => [ "method" => "crm.requisite.add", "params" => $fields ],
				"crmAdressAdd" => ["method" =>"crm.address.add","params" => $adresFields],
				"crmRequisiteBankdetailAdd" => ["method" =>"crm.requisite.bankdetail.add","params" => $bankDetailFields],
			];
			
			$batch = static::callBatch($arData, 0);
			if($batch["result"]["result"]["crmRequisiteAdd"]){
				return $batch["result"]["result"]["crmRequisiteAdd"];
			}else{
				return $batch;
			}
		}
		
		public static function createCompany( $gnkEntity, $inn )
		{
			$arDataGnk = $gnkEntity["data"];
			$type = strlen($inn) == 9 ? "entity" : "individual";
			
			$directorBio = $arDataGnk["gnk_company_director_name"];
			$directorBio = $directorBio ? explode(" ",$directorBio):"";
			
			$fields = [
				"fields" => [
					"TITLE" => $arDataGnk["gnk_company_name_full"],
					"UF_CRM_CHECK_CONTRAGENTS" => $inn, // ИНН
					"UF_CRM_1732280688058" => "", // Банковские реквизиты
					"UF_CRM_1730706873638" => "", // Название банка
					"UF_CRM_1732280758867" => $arDataGnk["gnk_status_name"], // Банковские реквизиты
					"UF_CRM_1730706901979" => $arDataGnk["gnk_company_address"], // Юр. адрес компании
					"UF_CRM_1730706882227" => $arDataGnk["gnk_company_account"], // Расчетный счет в банке
					"UF_CRM_1730706896133" => $arDataGnk["gnk_company_mfo"], // МФО
					"UF_CRM_1730706889624" => $arDataGnk["gnk_company_oked"], // ОКЭД
					"UF_CRM_1732280703903" => $directorBio ? $directorBio[0]: "", // Фамилия директора
					"UF_CRM_1732280711686" => $directorBio ? $directorBio[1]: "", // Имя директора
					"UF_CRM_1730706908545" => $arDataGnk["gnk_company_director_name"] ?? "", // Статус плательщика НДС
				],
				"params" => [ "REGISTER_SONET_EVENT" => "N" ]	
			];
			
			if($type == "individual"){
				$fields["fields"]["LAST_NAME"] = $directorBio ? $directorBio[0] : "";
				$fields["fields"]["NAME"] = $directorBio ? $directorBio[1] : "";
				$fields["fields"]["SECOND_NAME"] = $directorBio ? $directorBio[2] : "";
			}

			$addCompany = static::call("crm.company.add", $fields );

			if($addCompany["result"])
			{

				$requisiteCreate = static::requisiteCreate($addCompany["result"], $inn, $gnkEntity, $type );
				if($requisiteCreate["result"][0]){

					return [
						"compeny_res" => $addCompany["result"],
						"requisite_res" => $requisiteCreate
					];

				}else{
					return [
						"compeny_res" => $addCompany,
						"requisite_res" => $requisiteCreate
					];
				}
			}
		}

		public static function createContact($gnkEntity,$inn)
		{
			$arDataGnk = $gnkEntity["data"];
			$type = strlen($inn)==9?"entity":"individual";
			$fullNameArr = explode(" ",$arDataGnk["gnk_company_name_full"]);
			$fields = [
				"fields" => [
					"NAME"=>$fullNameArr[0],
					"LAST_NAME"=>$fullNameArr[1],
					"SECOND_NAME"=>$fullNameArr[2],
					"UF_CRM_APP_CPV_FIELD"=>$inn, // ИНН
				],
				"params" => [ "REGISTER_SONET_EVENT" => "N" ]	
			];
			$addContact = static::call("crm.contact.add",$fields);
			if($addContact["result"]){
				$requisiteCreate = static::requisiteCreate($addContact["result"],$inn,$gnkEntity, $type );
				if($addContact["result"]){
					return $addContact["result"];
				}else{
					return $requisiteCreate;
				}
			}
		}

		public static function getCompanyByTinCRM($inn)
		{
			$company = static::call("crm.requisite.list",[
				"filter" => [ "RQ_INN"=>$inn ]
			] );

			return $company;
		}
		
		public static function getCompanyBindedContacts($company_id)
		{
			$contacts = static::call("crm.company.contact.items.get",[
				"id" => $company_id
			]);

			return $contacts["result"];
		}

		protected static function multibankNewAuthTokens()
		{
			$app_options = static::call( 'app.option.get', [] );

			if($app_options["error"]) {
				return $app_options;
			} else {
				$app_options = $app_options["result"];
			}

			$arParams = array(
				'client_id' => '8',
				'client_secret' => 'kV6eVfCQ1u1iVR6Def4K5mMQc9M1NG5t9PS4K1IJ',
				'username' => $app_options["login"],
				'password' => $app_options["password"],
				'scope' => '',
				'grant_type' => 'password',
			);
			
			// return [$multibank_domain, $arParams, $appOption ];
			$authTokensJson = static::callCustomCurl('POST',"https://auth.multibank.uz/oauth/token",$arParams,[]);
			$authTokens = json_decode($authTokensJson,1);

			if(empty($authTokens["error"]))
			{	
				$app_options["multibank_auth"] = [
					"access_token" => $authTokens["access_token"],
					"refresh_token" => $authTokens["refresh_token"]
				];

				$appOption = static::call('app.option.set',[
					"options" => $app_options
				]);
				
				if(!$appOption["error"]){

					$authTokens["success"] = true;
					return $authTokens;
				}else{
					return $appOption;
				}

			}else{
				
				$authTokens["success"] = false;
				return $authTokens;
			}
		}

		protected static function multibankRefreshAuthTokens($tokens)
		{
			
			$inputPostDataJson = file_get_contents("php://input");
			$inputPostData = json_decode($inputPostDataJson,1);

			$arParams = array(
				'client_id' => '8',
				'client_secret' => 'kV6eVfCQ1u1iVR6Def4K5mMQc9M1NG5t9PS4K1IJ',
			);

			if($tokens["refresh_token"]){

				$arParams['refresh_token'] = $tokens["refresh_token"];

			}else{
				
				$appOption = static::call(
					'app.option.get',
					[]
				);
	
				if($appOption["error"]) {
					return $appOption;
				}else{
					$appOption = $appOption["result"];
				}

				$arParams['refresh_token'] = $appOption["multibank_auth"]["refresh_token"];
			} 
			
			$multibank_domain = "api.multibank.uz";
			
			// return [$multibank_domain, $arParams, $appOption ];
			$authTokensJson = static::callCustomCurl('POST',"https://".$multibank_domain."/api/profiles/v1/profile/refresh_token",$arParams,[]);
			$authTokens = json_decode($authTokensJson,1);

			if(empty($authTokens["error"])){
				
				$appOption["multibank_auth"] = [
					"access_token" => $authTokens["access_token"],
					"refresh_token" => $authTokens["refresh_token"]
				];

				$appOption = static::call('app.option.set',[
					"options" => $appOption
				]);
				
				if(!$appOption["error"]){

					$authTokens["success"] = true;
					return $authTokens;
				}else{
					return $appOption;
				}

			}else if($authTokens["message"] == "The refresh token is invalid."){
				return self::multibankNewAuthTokens();
			}else{
				$authTokens["success"] = false;
				return $authTokens;
			}
		}
		
		public static function getCompanyByTinGNK( $inn, $tokens = null, $retryCount = 3)
		{
			$headers = array(
				'Content-Type: application/json',
				'Authorization: Bearer '.$tokens["access_token"]
			);

			$refreshParam = 'refresh=1'; // При значении true, стягиваются свежие данные, в противоположном случае данные стагиваются из бд мультибанка 
			$url = "https://api.multibank.uz/api/check_contragent/v1/gnk/{$inn}?$refreshParam";
			
			$companyJson = static::callCustomCurl("GET", $url, [], $headers);
			$company = json_decode($companyJson,1);

			/* Успешно */
			if($company && $company["success"]){
				return $company;
			}else{
				/* Если токены устарели, обновляем */
				if($company["message"] == "Unauthorized") {

					$tokens = static::multibankRefreshAuthTokens($tokens);

					if ( $tokens["success"] === true && $retryCount > 0) {
						return static::getCompanyByTinGNK( $inn, $tokens, $retryCount - 1);
					} else {
						return ['error' => $tokens["error"], 'token_error_json' => $tokens];
					}
				
				}else{
					return ['error' => $company["message"]];
				}
			}
		}

		public static function callCustomCurl($methodType, $url, $params, $headers)
		{
			$curl = curl_init();

			curl_setopt_array($curl, array(
				CURLOPT_URL => $url,
				CURLOPT_RETURNTRANSFER => true,
				CURLOPT_ENCODING => '',
				CURLOPT_MAXREDIRS => 10,
				CURLOPT_TIMEOUT => 0,
				CURLOPT_FOLLOWLOCATION => true,
				CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
				CURLOPT_CUSTOMREQUEST => $methodType,
				CURLOPT_POSTFIELDS => $params,
				CURLOPT_HTTPHEADER => $headers
			));

			$response = curl_exec($curl);

			curl_close($curl);
			return $response;
		}

	}