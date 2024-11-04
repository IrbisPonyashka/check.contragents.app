<?php 

    if($_POST['login'] && $_POST['password']){
        include 'crest.php';
        $token = getTokenAuth($_POST['login'],$_POST['password']);
        if(!$token['error']){
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success'=>true, 'access_token'=>$token['access_token'],'refresh_token'=>$token['refresh_token'],'expires_in'=>$token['expires_in']]);
        }else{
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success'=>false, 'message'=>$token]);
        }    
    }else if(!$_POST['login'] && $_POST['password']){
        $message = "Пожалуйста введите логин";   
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success'=>false, 'message'=>$_POST]);
    }
    // echo $_POST;
    if($_POST["INN_GET"]){
        include 'crest.php';
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(generalDATA($_REQUEST["INN_GET"]["login"],$_REQUEST["INN_GET"]["password"] , $_REQUEST["INN_GET"]["INN"]));
    }

    
    header('Content-Type: application/json; charset=utf-8');
    // Получаем данные из тела POST-запроса
    $inputData = file_get_contents('php://input');

    if (json_decode($inputData, true)["SET_FILE"]) {
        // Распарсим JSON-данные из тела запроса
        $postData = json_decode($inputData, true)["SET_FILE"];
        
        if ($postData) {
            include 'crest.php';
            LogResponse($postData,"result");
            
            echo json_encode($postData);
        } else {
            // Если не удалось распарсить JSON, вернем сообщение об ошибке
            echo json_encode(["error" => "Ошибка при парсинге JSON данных"]);
        }
    } 



?>