<?php
// require_once($_SERVER['DOCUMENT_ROOT'] . "/bitrix/modules/main/include/prolog_before.php");

// $body в виде простого php массива, внутри функии callMethod, конвертируется в JSON

$body = [
    "fields" => [
        "TITLE" => "test",
        "RESPONSIBLE_ID" => "250548"
    ]
];

// создаем задачу
$taskAdd = callMethod("https://test-bitrix.uzum.com/rest/250548/k11zb2bzq5ej8hca/", "tasks.task.add.json", null, $body);

if($taskAdd->result){
    $taskID = $taskAdd->result->task->id;
    
    /* это я не трогал :) */
    $path = 'https://w.forfun.com/fetch/03/03f8cd3f6796daaacc1fe43ffb7704b7.jpeg'; 
    $type = pathinfo($path,PATHINFO_EXTENSION);
    $data = file_get_contents($path);
    $base64 = 'data:image/'.$type.';base64,'.base64_encode($data);
    /*  */

    $newBody = [
        "taskId" => $taskID,
        "fields" => [
            "NAME" => "test",
            "CONTENT" => $base64
        ]
    ];
    $taskFileAdd = callMethod("https://test-bitrix.uzum.com/rest/250548/k11zb2bzq5ej8hca/", "task.item.addfile.json", null, $newBody);

}

// Для проверки результата 
echo '<pre>'; print_r([$taskAdd->result->task->id, $taskFileAdd->result]); echo '</pre>';

/**
 *
 * @var $url - url запроса без метода (пример - https://test-bitrix.uzum.com/rest/250548/k11zb2bzq5ej8hca/)
 * @var $method - метод (tasks.task.add)
 * @var $headers - параметры в url (не обязательный)
 * @var $body - параметры в тело в виде array (не обязательный)
 */
function callMethod($url, $method, $headers = null, $body = null)
{
    
    $curl = curl_init();

    $query = empty($headers) ? '' : '?'.http_build_query($headers);

    curl_setopt_array(
        $curl,
        array(
            CURLOPT_URL => "$url/$method".$query,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 0,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => empty($body) ? '' : json_encode($body),
            CURLOPT_HTTPHEADER => array(
                'Content-Type: application/json'
            ),
        )
    );

    $response = curl_exec($curl);

    return json_decode($response);

}