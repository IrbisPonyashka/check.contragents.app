<?
/**
 * Страница настроек приложения. Данная версия отличается от приложения из маркета
 * Здесь настроены ручная и автоматическая синхронизация сделок и компаний
*/
?>

<?php
require_once('../src/crest.php');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Проверка контрагентов | Multicheck</title>
    <? 
        $random = rand();
    ?>
    <link rel="icon" href="../assets/favicon.ico">

    <!-- bootstrap stylesheets -->
    <link rel="stylesheet" href="https://bootstrap-4.ru/docs/5.3/scss/helpers/_color-bg.scss">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    <!-- bootstrap stylesheets / -->
	 
    <link href="https://dev.1c-bitrix.ru/bitrix/js/ui/design-tokens/dist/ui.design-tokens.min.css?167518260722029" rel="stylesheet">
    <link href="https://dev.1c-bitrix.ru/bitrix/js/ui/alerts/src/ui.alert.css?16954937448996" rel="stylesheet">
    <link href="../styles/chunk-vendors.css" rel="stylesheet">
    <link href="../styles/bootstrap.min.css" rel="stylesheet">
    <link href="../styles/app.install.css<?="?v=".$random?>" rel="stylesheet">
    <script src="//api.bitrix24.com/api/v1/"></script> 
    <script type="text/javascript" src="../scripts/libs/jquery.min.js<?="?v=".$random?>"></script>
    <script type="text/javascript" src="../scripts/main.js<?="?v=".$random?>"></script>
	

</head>
<body>
	<? 
		$appOption = CRest::call(
			'app.option.get',
			[]
		)["result"];
		$crm_deal_sync_info = $appOption["crm_deal_sync_info"];
		$crm_company_sync_info = $appOption["crm_company_sync_info"];
		
		$deal_category_list = CRest::call('crm.dealcategory.list',[])["result"];
	?>
    <div class="login__wrapper installed">
        <div class="login__inner">
            <div class="left_column">
				<div class="left_column__inner">
					<div class="multibank-logo">
						<a title="Multibank" class="site_logo">
							<img src="../assets/logo.svg" alt="multibank.uz">
						</a>
					</div>
					<div class="login__form">
						<div class="login__form_block">
							<div>
								<h2 class="login_form__title h2_title" data-v-fade-in>Модуль «multicheck.Проверка контрагентов» успешно установлен</h2>
								<div data-v-fade-in class="login_form__inner">
									<svg class="succes-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M17.5303 9.53033C17.8232 9.23744 17.8232 8.76256 17.5303 8.46967C17.2374 8.17678 16.7626 8.17678 16.4697 8.46967L17.5303 9.53033ZM9.99998 16L9.46965 16.5304C9.76255 16.8232 10.2374 16.8232 10.5303 16.5304L9.99998 16ZM7.53027 12.4697C7.23737 12.1768 6.7625 12.1768 6.46961 12.4697C6.17671 12.7626 6.17672 13.2374 6.46961 13.5303L7.53027 12.4697ZM16.4697 8.46967L9.46965 15.4697L10.5303 16.5304L17.5303 9.53033L16.4697 8.46967ZM6.46961 13.5303L9.46965 16.5304L10.5303 15.4697L7.53027 12.4697L6.46961 13.5303ZM20.25 12C20.25 16.5563 16.5563 20.25 12 20.25V21.75C17.3848 21.75 21.75 17.3848 21.75 12H20.25ZM12 20.25C7.44365 20.25 3.75 16.5563 3.75 12H2.25C2.25 17.3848 6.61522 21.75 12 21.75V20.25ZM3.75 12C3.75 7.44365 7.44365 3.75 12 3.75V2.25C6.61522 2.25 2.25 6.61522 2.25 12H3.75ZM12 3.75C16.5563 3.75 20.25 7.44365 20.25 12H21.75C21.75 6.61522 17.3848 2.25 12 2.25V3.75Z" fill="#4BB543"></path></g></svg>	
									
									<div form-element="" class="extra-options">
										<!-- <h2 class="extra-options-title">Дополнительные параметры</h2> -->
										<!-- <h2 class="extra-options-title"> </h2> -->
										<ul id="tabs" class="menu col-sm-12 gap-4 d-flex align-items-center list-unstyled">
											<li class="nav-item">
												<a class="btn btn-outline-primary active" id="options"> 	Параметры  </a>
											</li>
											<li class="nav-item">
												<a class="btn btn-outline-primary" id="update"> 	Обновление реквизитов </a>
											</li>
											<li class="nav-item">
												<a class="btn btn-outline-primary" id="autoUpdate"> Обновление реквизитов (авто)  </a>
											</li>
										</ul>
										<div class="tab_container" id="optionsC">
											<h3 class="extra-options-subtitle">Перезаписывать название организации</h3>
											<ul form-element="" class="extra-options-list">
												<li form-element="" class="extra-options-item">
													<label form-element="" for="rename_company-name" class="form-check-label cp">Карточка компании</label>
													<div class="form-check form-switch form-switch-sm">
														<input class="form-check-input data-param" type="checkbox" name="renameCompany">
													</div>
												</li>
												<li form-element="" class="extra-options-item">
													<label form-element="" for="rename_company-name" class="form-check-label cp">Карточка контакта</label>
													<div class="form-check form-switch form-switch-sm">
														<input class="form-check-input data-param" type="checkbox" name="renameContact">
													</div>
												</li>
											</ul>
											<h3 class="extra-options-subtitle">Шаблоны реквизитов</h3>
											<ul form-element="" class="extra-options-list">
												<li form-element="" class="extra-options-item">
													<label form-element="" for="rename_company-name" class="form-check-label cp">Компании</label>
													<select class="extra-options__select data-param" option="EntityPresetId" name="entity">
														<!-- <option value="">Юр лицо</option>
														<option value="">Юр лицо</option>
														<option value="">Юр лицо</option> -->
													</select>
												</li>
												<li form-element="" class="extra-options-item">
													<label form-element="" for="rename_company-name" class="form-check-label cp">Контакта</label>
													<select class="extra-options__select data-param" option="IndividaulPresetId" name="individual">
														<!-- <option value="">Физ лицо</option>
														<option value="">Физ лицо</option>
														<option value="">Физ лицо</option> -->
													</select>
												</li>
											</ul>
											<div class="ui-alert ui-alert-icon-info ui-alert-success">
												<span class="ui-alert-message"><!-- <strong>Внимание!</strong> --> Параметры автоматически применяются непосредственно после их изменения.</span>
											</div>
										</div>
										<div class="tab_container" id="updateC">
											<h3 class="extra-options-subtitle">Ручное обновление</h3>
											<div class="left_column__logs" id="logs" style="display: block;">
												<div class="container manual_update_container">
													<div class="mb-3">
														<label for="category_id" class="form-label">Выберите воронку сделок</label>
														<select class="form-select" id="category_id">
															<? foreach ($deal_category_list as $key => $category) { ?>
																<option value="<?=$category["ID"]?>"> <?=$category["NAME"]?></option>
															<? } ?>
														</select>
													</div>

													<div class="d-flex gap-2">
														<button id="sync-btn" class="btn btn-bx-primary" style="display:block" >Начать обновление</button>
														<button id="resume-btn" data-id="0" data-count="0" class="btn btn-success" style="display:none">Остановить</button>
														<button id="resume-btn-2" class="btn btn-secondary" style="display:none">Продолжить</button>
													</div>

													<div class="mt-3">
														<div id="log" class="card log-box">
															<p>Ожидание действий...</p>
														</div>
													</div>

													<button id="clear-log" class="btn btn-danger mt-2">Очистить лог</button>
												</div>
											</div>
											<div class="container">
												<table class="table table-borderless w-100" style="
														/* border-top: 1px solid #00000059; */
														background: #eeeeee;
														padding: 1px;
														margin-top: 1rem;
														border-radius: 1rem;
													">
													<tbody>
														<tr>
															<td class="fw-bold text-start">Сделок обновлено:</td>
															<td id="deal_manual_update_count"></td>
														</tr>
														<tr>
															<td class="fw-bold text-start">Последняя обновленная сделка:</td>
															<td id="deal_manual_update_id"></td>
															<!-- <td>
																<? if($crm_deal_sync_info['last_deal_id']) {?>
																	<a href="javascript:void(0)" onclick="BX24.openPath('/crm/deal/details/<?= $crm_deal_sync_info['last_deal_id'] ?>/')" > #<?= $crm_deal_sync_info['last_deal_id'] ?> </a>
																<? } ?>
															</td> -->
														</tr>
														<tr>
															<td class="fw-bold text-start">Время последней синхронизации: </td>
															<td id="deal_manual_update_update_at"></td>
														</tr>
													</tbody>
												</table>
											</div>
										</div>
										<div class="tab_container" id="autoUpdateC">
											<h3 class="extra-options-subtitle">Статус периодического обновления через cron</h3>
											<table class="table table-borderless w-100">
												<tbody>
													<tr>
														<td class="fw-bold text-start">Сделок обновлено:</td>
														<td><?= $crm_deal_sync_info["count"] ?? "0" ?></td>
													</tr>
													<tr>
														<td class="fw-bold text-start">Последняя обновленная сделка:</td>
														<td>
															<? if($crm_deal_sync_info['last_deal_id']) {?>
																<a href="javascript:void(0)" onclick="BX24.openPath('/crm/deal/details/<?= $crm_deal_sync_info['last_deal_id'] ?>/')" > #<?= $crm_deal_sync_info['last_deal_id'] ?> </a>
															<? } ?>
														</td>
													</tr>
													<tr>
														<td class="fw-bold text-start">Время последней синхронизации: </td>
														<td>
															<?= $crm_deal_sync_info["update_at"] ?? "null" ?>
														</td>
													</tr>
													<tr style="border: 1px solid #0000008c;">
													</tr>
													<tr>
														<td class="fw-bold text-start">Компаний обновлено:</td>
														<td><?= $crm_company_sync_info["count"] ?? "0" ?></td>
													</tr>
													<tr>
														<td class="fw-bold text-start">Последняя обновленная компания:</td>
														<td>
															<? if($crm_company_sync_info['last_company_id']) {?>
																<a href="javascript:void(0)" onclick="BX24.openPath('/crm/company/details/<?= $crm_company_sync_info['last_company_id'] ?>/')" > #<?= $crm_company_sync_info['last_company_id'] ?> </a>
															<? } ?>
														</td>
													</tr>
													<tr>
														<td class="fw-bold text-start">Время последней синхронизации: </td>
														<td>
															<?= $crm_company_sync_info["update_at"] ?? "null" ?>
														</td>
													</tr>
												</tbody>
											</table>
										</div>
									</div>

								</div>
							</div>
						</div>
					</div>
				</div>
            </div>
        </div>
    </div>
	<script>
		BX24.resizeWindow(document.body.clientWidth, 1020);
		document.addEventListener("DOMContentLoaded", async (event) => {
			BX24.callMethod("app.option.get",{},
				(appOption) => { 
					if(appOption.error()){
						console.error(appOption.data());
					}else{
						// отрисовка из параметров
						const parametres = appOption.data().params;
						BX24.callMethod("crm.requisite.preset.list",{},
							(result) => { 
								if(result.error()){
									console.error(result.data());
								}else{
									let selectNodeArr = Array.from(document.querySelectorAll("select.data-param"));
									if(selectNodeArr.length){
										selectNodeArr.forEach(option => {
											option.innerHTML = ``;
											if(option.name == "individual"){
													result.data().forEach(el => {
													option.innerHTML += `<option id="${el.ID}" ${el.ID==parametres.IndividaulPresetId?"selected":""}>${el.NAME}</option>`;
												});
											}else if(option.name == "entity"){
												result.data().forEach(el => {
													option.innerHTML += `<option id="${el.ID}" ${el.ID==parametres.EntityPresetId?"selected":""}>${el.NAME}</option>`;
												});
											}

											// console.log(Object.keys(parametres).includes(option.name) ? parametres[option.name] : parametres[option.name]);
											
											// option.checked = Object.keys(parametres).includes(option.name) ? JSON.parse(parametres[option.name]) : JSON.parse(parametres[option.name]); 
										});
									}
								}
							}
						);
						// запись в параметры
						let fieldParams = document.querySelectorAll(".data-param");
						if(fieldParams.length){
							fieldParams.forEach(el => {
								el.addEventListener("change", (e) => {
									// objectParams = {};
									if(el.name == "renameContact" || el.name == "renameCompany"){
										parametres[el.name] = el.checked;
									}else{
										parametres[el.getAttribute("option")] = el.options[el.selectedIndex].id;
									}
									BX24.callMethod("app.option.set",{
										"options" : {
											"params" : parametres,          
										}
									},(result) => {
										if(result.error()){
											console.error(result.error());
										}else{
										}
									});
								})
							});
						}
					}
				}
			);
		});
	</script>
	
    <script type="text/javascript">
        $(document).ready( () => {

            $('#tabs li a:not(:first)').addClass('inactive');
            $('.tab_container').hide();
            $('.tab_container:first').show();

            $('#tabs li a').click(function () {
                if ($(this).hasClass('inactive')) {
                    $('#tabs li a').addClass('inactive');
                    $('#tabs li a').removeClass('active');

                    $(this).removeClass('inactive');
                    $(this).addClass('active');

                    var t = $(this).attr('id');
                    $('.tab_container').hide();
                    $('#' + t + 'C').fadeIn('slow');
                }
            });
        });
    </script>
</body>
</html>