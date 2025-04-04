require: slotfilling/slotFilling.sc
  module = sys.zb-common
require: dateTime/dateTime.sc
  module = sys.zb-common
require: fileReader.js
    type = scriptEs6
    name = fileReader
theme: /

    state: Hello
        a: Выберите метод
        buttons:
            "Распознать текст с фотографии" -> /RecognizePhoto
            "Распознать текст с фотографии (детально)" -> /RecognizePhotoDetail
            "Распознавание объектов" -> /RecognizeObjects
            "Отправить гео" -> /Get Geo Info
            "Передать гео и видео-отчет" -> /SetProccessType
    state: Bye
        intent!: /пока
        a: До встречи!
        EndSession: 
            actions = 

    state: NoMatch
        event!: noMatch
        a: Я не понял. Вы сказали: {{$request.query}}

    state: Match
        event!: match
        a: {{$context.intent.answer}}

    state: Start
        intent!: /привет
        q!: $regex</start>
        go!: /Hello
            
    state: RecognizePhoto
        InputFile: 
            prompt = Приложите фотографию, на котором нужно распознать текст или код. Фото должно быть четким и разборчивым.
            varName = inputImageUrl
            html = 
            htmlEnabled = false
            errorState = /RecognizePhoto
            actions = 
            then = /SendImageToRecognizeAI
            
    state: RecognizePhotoDetail
        InputFile: 
            prompt = Приложите фотографию, на котором нужно распознать текст или код. Фото должно быть четким и разборчивым.
            varName = inputImageUrl
            html = 
            htmlEnabled = false
            errorState = /RecognizePhotoDetail
            actions = 
            then = /SendImageToDetailRecognizeAI
            
    state: RecognizeObjects
        InputFile: 
            prompt = Приложите фотографию, на котором нужно распознать объекты. Фото должно быть четким и разборчивым.
            varName = inputImageUrl
            html = 
            htmlEnabled = false
            errorState = /RecognizeObjects
            actions = 
            then = /SendImageToRecognizeObjsAI
            
    state: BxSaveVinPhoto
        InputFile: 
            prompt = Сделайте фото vin автомобиля. Фото должно быть четким и разборчивым.
            varName = vinCodeImageData
            html = 
            htmlEnabled = false
            errorState = /BxSaveVinPhoto
            actions = 
            then = /BxSendPhoto
            
    state: SendImageToRecognizeAI
        script:
            $temp.response = $http.query("https://smarty.mail.ru/api/v1/text/recognize?oauth_token=2e4iHALUSmVm9BT9Vt7E1TsNgcgp5pM7cpsTTaCveqWaZE3nK5&oauth_provider=mcs", {
                method: "POST",
                fileUrl: $session.inputImageUrl,
                fileName: "image.png",
                form: {
                    meta: JSON.stringify({
                      images: [{ name: "file" }]
                    })
                }
            });
            
            if($temp.response.data.body.objects && $temp.response.data.body.objects[0] && $temp.response.data.body.objects[0].text){
                $temp.objectRes = $temp.response.data.body.objects[0];
                $reactions.answer( "Текст на фотографии: " + $temp.objectRes.text );
            }else if($temp.response.data.body.objects[0].error){
                $reactions.answer({ value: "Error", tts: "", html: "<h4>Что-то пошло не так:</h4><br> <pre>" + toPrettyString($temp.response.data.body.objects[0].error) + "</pre>" });
            }else{
                $reactions.answer({ value: "Error", tts: "", html: "<h4>Не удалось обработать картинку</h4>"});
            }  
        go!: /Hello
            
    state: SendImageToDetailRecognizeAI
        script:
            $temp.response = $http.query("https://smarty.mail.ru/api/v1/text/recognize?oauth_token=2e4iHALUSmVm9BT9Vt7E1TsNgcgp5pM7cpsTTaCveqWaZE3nK5&oauth_provider=mcs", {
                method: "POST",
                fileUrl: $session.inputImageUrl,
                fileName: "image.png",
                form: {
                    meta: JSON.stringify({
                        mode: "detailed",
                        images: [{ name: "file" }]
                    })
                }
            });
        
            if($temp.response.data.body.objects && $temp.response.data.body.objects[0] && $temp.response.data.body.objects[0].results){
                $temp.objectRes = $temp.response.data.body.objects[0].results;
                
                $temp.answerText = "<b>Обнаружено слов:</b> " + $temp.objectRes.length + ".<br>";
                
                $temp.objectRes.forEach(function (obj, index) {
                    var word = obj.words[0];
                    $temp.answerText += 
                        "<b>" + (index + 1) + ".</b> " +
                        "<b>Текст:</b> <code>" + word.text + "</code><br>" +
                        "<b>Язык:</b> <i>" + word.lang + "</i><br>" +
                        "<b>Точность распознавания:</b> <span style='color:green;'>" + parseFloat((word.prob * 100).toFixed(1)) + "%</span><br>" +
                        "<b>Точность языка:</b> <span style='color:blue;'>" + parseFloat((word.lang_prob * 100).toFixed(1)) + "%</span><br>" +
                        "<b>Координаты текста:</b> <span style='color:green;'>" + "(" + word.coord[0] + ", " + word.coord[1] + ") → (" + word.coord[2] + ", " + word.coord[3] +")" + "</span><br><br>" ;
                });
                
                $reactions.answer({ value: "Result", tts: "", html: $temp.answerText });
            }else if($temp.response.data.body.objects[0].error){
                $reactions.answer({ value: "Error", tts: "", html: "<h4>Что-то пошло не так:</h4><br> <pre>" + toPrettyString($temp.response.data.body.objects[0].error) + "</pre>" });
            }else{
                $reactions.answer({ value: "Error", tts: "", html: "<h4>Не удалось обработать картинку</h4>"});
            }    
        
            # $reactions.answer($temp.answerText);
        go!: /Hello
        
    state: SendImageToRecognizeObjsAI
        script:
            $temp.response = $http.query("https://smarty.mail.ru/api/v1/objects/detect?oauth_token=2e4iHALUSmVm9BT9Vt7E1TsNgcgp5pM7cpsTTaCveqWaZE3nK5&oauth_provider=mcs", {
                method: "POST",
                fileUrl: $session.inputImageUrl,
                fileName: "image.png",
                form: {
                    meta: JSON.stringify({
                        mode: ["object", "object2", "multiobject", "car_number"],
                        images: [{ name: "file" }]
                    })
                }
            });
            # $reactions.answer( toPrettyString($temp.response.data.body));
            
            if($temp.response.data.body.object_labels || $temp.response.data.body.multiobject_labels ){
                
                $temp.multyObjects = $temp.response.data.body.multiobject_labels;
                $temp.objects = $temp.response.data.body.object_labels;
                
                $temp.answerText = "<b>Объекты, обнаруженные в изображении:</b> " + $temp.objects.length + ".<br>";
                
                // Выводим объекты из "object_labels"
                $temp.objects.forEach(function (file, fileIndex) {
                    
                    $temp.answerText += "<b>Объект №" + (fileIndex + 1) + ":</b><br>";
                    
                    file.labels.forEach(function (label, index) {
                        $temp.answerText += 
                            "<b>" + (index + 1) + ".</b> " +
                            "<b>Текст:</b> <code>" + label.rus + "</code> / <code>" + label.eng + "</code><br>" +
                            "<b>Точность:</b> <span style='color:green;'>" + (label.prob * 100).toFixed(1) + "%</span><br>" +
                            "<b>Координаты:</b> (" + label.coord[0] + ", " + label.coord[1] + ") → (" + label.coord[2] + ", " + label.coord[3] + ")<br><br>";
                    });
                });
                
                $temp.answerText += "<b>Мульти-объекты, обнаруженные в изображении:</b> " + $temp.multyObjects.length + ".<br>";
                
                $temp.multyObjects.forEach(function (obj, index) {
                    
                    $temp.answerText += "<b>Мульти-объект №" + (index + 1) + ":</b><br>";
                    
                    obj.labels.forEach(function (label, index) {
                        $temp.answerText += 
                            "<b>" + (index + 1) + ".</b> " +
                            "<b>Текст:</b> <code>" + label.rus + "</code> / <code>" + label.eng + "</code><br>" +
                            "<b>Точность:</b> <span style='color:green;'>" + (label.prob * 100).toFixed(1) + "%</span><br>" +
                            "<b>Координаты:</b> (" + label.coord[0] + ", " + label.coord[1] + ") → (" + label.coord[2] + ", " + label.coord[3] + ")<br><br>";
                    });
                });
                
                $reactions.answer({ value: "Result", tts: "", html: $temp.answerText });
            }else if($temp.response.data.body.error){
                $reactions.answer({ value: "Error", tts: "", html: "<h4>Что-то пошло не так:</h4><br> <pre>" + toPrettyString($temp.response.data.body.error) + "</pre>" });
            }else{
                $reactions.answer({ value: "Error", tts: "", html: "<h4>Не удалось обработать картинку</h4>"});
            }    
        
        go!: /Hello
        
    
    state: SetProccessType
        script:
            $session.proccessType = $request.query;
        if: $session.proccessType == "Передать гео и видео-отчет"
            go!: /GetVideoReprot
        
    state: Get Geo Info
        a: Отправьте геопозицию через скрепку.
        event: telegramSendLocation || toState = "/Geo info Auto_1"

    state: Geo info Auto_1
        script:
            $session.latitude = toPrettyString($request.rawRequest.message.location.latitude);
            $session.longitude = toPrettyString($request.rawRequest.message.location.longitude);
            $temp.yandexApiKey = $secrets.get("ya_geo_api_key");
            
            $temp.response = $http.query("https://geocode-maps.yandex.ru/1.x/?apikey="+ $temp.yandexApiKey +"&geocode="+ $session.longitude +","+ $session.latitude +"&format=json", {
                method: "GET"
            });
            
            
            # $reactions.answer( toPrettyString($temp.response.data.GeoObjectCollection).slice(0, 100) );
            
            if(!$temp.response.data.error && $temp.response.data.response.GeoObjectCollection && $temp.response.data.response.GeoObjectCollection.featureMember ){
                $temp.geoObject = $temp.response.data.response.GeoObjectCollection.featureMember[0].GeoObject.metaDataProperty.GeocoderMetaData;
                
                $temp.answer_text = "<b>Адрес (текст):</b> " + $temp.geoObject.text + "<br>";
                $temp.answer_text += "<b>Вид найденного объекта:</b> " + $temp.geoObject.kind + "<br>";
                
                // слишком большой json
                $temp.answer_text += "<b>Адрес (главный объект: geoObject.Address) =></b> <br>";
                $temp.answer_text += "<pre>" + toPrettyString($temp.geoObject.Address) + "</pre>";
                
                $reactions.answer( { value: "Локация", tts: "", html: $temp.answer_text });
            }else{
                $reactions.answer( toPrettyString($temp.response.data));
            }  
            
        # a: Спасибо. {{toPrettyString($temp.response.data.response.GeoObjectCollection)}}
        # a: Спасибо. Гео-поцизия принята.
        #         Ш: {{$session.latitude}} 
        #         Д: {{$session.longitude}}
        # go!: /BxDataSendGeo_2
        
    # state: SendImageToAI
    #     scriptEs6:
    #         # $session.fileBlobObj = await fileReader.getImageBlobByURL($session.vinCodeImage);
    #         # $reactions.answer({ value: "Result", tts: "", html: "<pre>" + toPrettyString($session.fileBlobObj).slice(0, 100) + "</pre>" });
    #         # $session.imageRecgnizeRequest = await fileReader.sendImageRecognizeAI($session.fileBlobObj);
    #         # $reactions.answer({ value: "Result", tts: "", html: "<pre>" + toPrettyString($session.imageRecgnizeRequest) + "</pre>" });
    #     script:
    #         # $session.formData = new FormData();
    #         # $session.formData.append("file", $session.fileBlobObj);
    #         # $session.formData.append("meta", JSON.stringify({
    #         #   mode: "detailed",
    #         #   images: [{ name: "rcngize_image" }]
    #         # }));
           
    #     #   $temp.response = $http.query("https://smarty.mail.ru/api/v1/text/recognize?oauth_token=2e4iHALUSmVm9BT9Vt7E1TsNgcgp5pM7cpsTTaCveqWaZE3nK5&oauth_provider=mcs", {
    #     #         method: "POST",
    #     #         fileUrl: $session.vinCodeImage,
    #     #         fileName: "image.png",
    #     #         form: {
    #     #             meta: JSON.stringify({
    #     #               images: [{ name: "file" }]
    #     #             })
    #     #         }
    #     #     });
    #     #     $reactions.answer({ value: "Result", tts: "", html: "<pre>" + toPrettyString($temp.response.data.body.objects[0]) + "</pre>" });
            
    #         # if: $temp.response.data.body
    #         #     a: a: Result {{ toPrettyString($temp.response.data.body.objects) }}
    #         # else:
    #         #     a: Не удалось обработать
        
        
    #         # $http.query("https://smarty.mail.ru/api/v1/text/recognize?oauth_token=2e4iHALUSmVm9BT9Vt7E1TsNgcgp5pM7cpsTTaCveqWaZE3nK5&oauth_provider=mcs", {
    #         #     method: "POST",
    #         #     body: $session.formData,
    #         #     headers: {
    #         #         "Content-Type": "application/json",
    #         #     },
    #         #     dataType: "json",
    #         #     timeout: 10000
    #         # });
    #         # HttpRequest: 
    #         #     url = https://smarty.mail.ru/api/v1/text/recognize?oauth_token=2e4iHALUSmVm9BT9Vt7E1TsNgcgp5pM7cpsTTaCveqWaZE3nK5&oauth_provider=mcs
    #         #     method = POST
    #         #     dataType = 
    #         #     body = {
    #         #         "file": "{{$session.fileBlobObj}}",
    #         #         "meta": {
    #         #         "mode": ["detailed"],
    #         #         "images": [{"name": "file"}]
    #         #         }
    #         #     }
    #         #     okState = /SendImageToAI/imageRecgnizeSuccess
    #         #     timeout = 0
    #         #     headers = [{"name":"Accept","value":"application\/json"}]
    #         #     vars = [{"name":"BxRes","value":"$httpResponse"}]
    #         #     errorState = /SendImageToAI/imageRecgnizeError
    #         # state: imageRecgnizeSuccess
    #         #     a: success {{toPrettyString($session.BxRes).slice(0, 150) + '...'}}
    #         # state: imageRecgnizeError
    #         #     a: error {{toPrettyString($session.BxRes).slice(0, 150) + '...'}}

    state: Vin Foto Accepted
        a: Фото с vin-номером успешно принято. 
            1. {{$session.status}}
            2. {{$session.filefotovin}}
            3. {{toPrettyString($session.filefotovin)}}
            
        go!: /BxDataSend_1

    state: Vin Foto not Accepted
        a: Фото с vin не удалось обработать. Попробуйте ещё раз. {{$session.status}}
        go!: /Get Vin Foto

    state: BxSendPhoto
        # --- этот блок для отправки картинки в битрикс24
        # --- start ---
        scriptEs6:
            $temp.date = currentDate();
            # fileReader.getBase64FromUrl - возвращает массив в таком виде [ "имя картинки с расширением", строка Base64]
            $session.imageVinBase64 = await fileReader.getBase64FromUrl($session.vinCodeImageData);
            $session.updBxItemRes = await fileReader.sendImageToBxDynamicItem({ "entityTypeId": "1044", "id": "2", "fields": { "ufCrmPhotoVin": { "fileData": $session.imageVinBase64 } } });
            if(!$session.updBxItemRes.error && $session.updBxItemRes.result){
                $reactions.answer("Result => " + toPrettyString($session.updBxItemRes.result.item.id));
            }else{
                $reactions.answer("Result => " + toPrettyString($session.updBxItemRes));
            }
            
        # HttpRequest: 
        #     url = https://bx24.king-truck.ru/rest/7/u53lbcwvjgavx7s6/crm.item.update
        #     method = POST
        #     dataType = 
        #     body = {
        #         "entityTypeId": "1044",
        #         "id": "2",
        #         "fields": {
        #             "ufCrmPhotoVin": { fileData: {{$session.imageVinBase64}} },
        #             "ufCrmLdcomment":"{{$session.comment}}"}
        #         }
        #         }
        #     okState = /BxSendSuccess_1/Success
        #     timeout = 0
        #     headers = [{"name":"Accept","value":"application\/json"}]
        #     vars = [{"name":"updBxItemRes","value":"$httpResponse"}]
        #     errorState = /BxDataSend_1/Error
        # script:
        #     $session.index = 0
            
        # state: Success
        #     a: success {{ toPrettyString($session.updBxItemRes) }}
        # state: Error
        #     a: error {{ toPrettyString($session.updBxItemRes) }}
        script:
            $session.index = 0
        # --- stop ----
        
    #     # --- этот блок отправляет фотку нейронке и получает результат
    #     # --- start ---
    #     script:
    #         $temp.date = currentDate();
    #         $session.comment = "Обработка VIN номера";
    #     scriptEs6:
    #         $session.fileBlobObj = await fileReader.getImageBlobByURL($session.filefotovin);
    #         # $session.imageRecgnizeRequest = await fileReader.sendImageRecognizeAI($session.fileBlobObj);
    #         # $reactions.answer({ value: "Result", tts: "", html: "<pre>" + toPrettyString($session.imageRecgnizeRequest) + "</pre>" });
            
    #     HttpRequest: 
    #         url = https://smarty.mail.ru/api/v1/text/recognize?oauth_token=2e4iHALUSmVm9BT9Vt7E1TsNgcgp5pM7cpsTTaCveqWaZE3nK5&oauth_provider=mcs
    #         method = POST
    #         dataType = 
    #         body = {
    #             "file": "{{$session.fileBlobObj}}",
    #             "meta": {
    #             "mode": ["detailed"],
    #             "images": [{"name": "file"}]
    #             }
    #             }
    #         okState = /BxDataSend_1/imageRecgnizeSuccess
    #         timeout = 0
    #         headers = [{"name":"Accept","value":"application\/json"}]
    #         vars = [{"name":"BxRes","value":"$httpResponse"}]
    #         errorState = /BxDataSend_1/imageRecgnizeError
    #     state: imageRecgnizeSuccess
    #         a: success
    #             {{toPrettyString($session.BxRes).slice(0, 100) + '...'}}
    #     state: imageRecgnizeError
    #         a: error
    #             {{toPrettyString($session.BxRes)}}
    #     script:
    #         $session.index = 0
        # --- stop ----