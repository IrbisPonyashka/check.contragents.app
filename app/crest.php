<?php 
  
define("CLIENT_ID", '2');
define("CLIENT_SECRET", 'wZ3rNvrzz2MnJYfI9an0W1Z7AaTgF2DwX5oP9G6z');
// define("CLIENT_ID", 'local.642e6be818acd4.64397868');
// define("CLIENT_SECRET", 'hn5psGLd7e7DOT8vvFwom6iuqkDT10igoCxfuWDxpZK84t0cSW');

# log any array or string
function LogResponse($result, $comment){
    $html = '\-------'.$comment."---------\n";
    $html.= print_r($result,true);
    $html.="\n".date("d.m.Y H:i:s")."\n--------------------\n\n\n";
    $file="https://micros.uz//it/solutions_our/multicheck/log.txt";
    $old_data=file_get_contents($file);
    file_put_contents($file, $html.$old_data);
}

// LogResponse("result","result");

function restCommand($method, array $params = Array(), array $auth = Array(), $authRefresh = true)
{
    $queryUrl = "https://".$auth["domain"]."/rest/".$method;
    $queryData = http_build_query(array_merge($params, array("auth" => $auth["access_token"])));

    $curl = curl_init();

    curl_setopt_array($curl, array(
        CURLOPT_POST => 1,
        CURLOPT_HEADER => 0,
        CURLOPT_RETURNTRANSFER => 1,
        CURLOPT_SSL_VERIFYPEER => 1,
        CURLOPT_URL => $queryUrl,
        CURLOPT_POSTFIELDS => $queryData,
    ));

    $result = curl_exec($curl);
    curl_close($curl);

    $result = json_decode($result, 1);

    if ($authRefresh && isset($result['error']) && in_array($result['error'], array('expired_token', 'invalid_token')))
    {
        $auth = restAuthBitrix($auth);
        if ($auth)
        {
            $result = restCommand($method, $params, $auth, false);
        }
    }

    return $result;

}

function restAuthBitrix($auth)
{
    if (!CLIENT_ID || !CLIENT_SECRET)
        return false;

    if(!isset($auth['refresh_token'])  || !isset($auth['domain']))
        return false;

    $queryUrl = 'https://oauth.bitrix.info/oauth/token/';
    $queryData = http_build_query($queryParams = array(
        'grant_type' => 'refresh_token',
        'client_id' => CLIENT_ID,
        'client_secret' => CLIENT_SECRET,
        'refresh_token' => $auth['refresh_token']
    ));

    $curl = curl_init();

    curl_setopt_array($curl, array(
        CURLOPT_HEADER => 0,
        CURLOPT_RETURNTRANSFER => 1,
        CURLOPT_URL => $queryUrl.'?'.$queryData,
    ));

    $result = curl_exec($curl);
    curl_close($curl);

    $result = json_decode($result, 1);

    if (!isset($result['error']))
    {
        $result['domain'] = $auth['domain'];
        $auth = $result;

        
         # тут сохраняются параметры авторизации
         saveParams($auth);
    }
    else
    {
        $result = false;
    }
    
    return $result;
}
function restAuth($auth){
    
    if (!CLIENT_ID || !CLIENT_SECRET)
        return false;
        
        if(!isset($auth['refresh_token'])  || !isset($auth['domain']))
            return false;
            
            $queryUrl = 'https://oauth.bitrix.info/oauth/token/';
            $queryData = http_build_query($queryParams = array(
                'grant_type' => 'refresh_token',
                'client_id' => CLIENT_ID,
                'client_secret' => CLIENT_SECRET,
                'refresh_token' => $auth['refresh_token']
            ));
            
            $curl = curl_init();
            
            curl_setopt_array($curl, array(
                CURLOPT_HEADER => 0,
                CURLOPT_RETURNTRANSFER => 1,
                CURLOPT_URL => $queryUrl.'?'.$queryData,
            ));
            
            $result = curl_exec($curl);
            curl_close($curl);
            
            $result = json_decode($result, 1);
            if (!isset($result['error'])){
                $result['domain'] = $auth['domain'];
                $auth = $result;
            }
            else{
                $result = false;
            }
            
            return $result;
}

function generalDATA($login, $pass, $inn) {
// function generalDATA($token , $inn) {
    $token = getTokenAuth($login,$pass);
    // json_encode($token);
    $curl = curl_init();
    curl_setopt_array($curl, array(
        CURLOPT_URL => 'https://api.multibank.uz/api/check_contragent/v1/general/'.$inn.'?refresh=0',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'GET',
        CURLOPT_HTTPHEADER => array(
            'Authorization: Bearer '.$token["access_token"]
        ),
    ));

    
    $response = curl_exec($curl);

    curl_close($curl);
    return $response;
}

function GOSTAT($login, $pass, $inn) {
    
    $token = getTokenAuth($login,$pass);

    $curl = curl_init();

    curl_setopt_array($curl, array(
    CURLOPT_URL => 'https://api.multibank.uz/api/check_contragent/v1/stat/'.$inn.'?refresh=1',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => '',
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 0,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => 'GET',
    CURLOPT_HTTPHEADER => array(
        'Authorization: Bearer '.$token["access_token"]
    ),
    ));

    $response = curl_exec($curl);

    curl_close($curl);
    return $response;

}

function getInfo(){

    $curl = curl_init();

    curl_setopt_array($curl, array(
    CURLOPT_URL => 'https://account-staging.micros24.uz/api/user',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => '',
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 0,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => 'GET',
    ));

    $response = curl_exec($curl);

    curl_close($curl);
    return $response;    
}

function getTokenAuth($username, $pass){
    
    $curl = curl_init();

    curl_setopt_array($curl, array(
    CURLOPT_URL => 'https://auth.multibank.uz/oauth/token',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => '',
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 0,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => 'POST',
    CURLOPT_POSTFIELDS => array('grant_type' => 'password','client_id' => CLIENT_ID,'client_secret' => CLIENT_SECRET,'username' => $username,'password' => $pass,'scope' => ''),
    ));

    $response = curl_exec($curl);
    curl_close($curl);
    return json_decode($response,true);
    
}   