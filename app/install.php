<!DOCTYPE html>
<html lang="" style="--color-animation1: #ff9633; --color-animation2: #ffffff; --color-animation3: #17fd3d; --border-size: 5px solid transparent; --time-animation1: spin-circular 1.5s linear infinite; --time-animation2: spin-circular 2s linear infinite; --time-animation3: spin-circular 21s linear infinite;">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Проверка контрагентов | multicheck.app</title>
    <link rel="icon" href="../assets/favicon.ico">
    <link href="../styles/app.install.css" rel="stylesheet">
    <link href="../styles/chunk-vendors.css" rel="stylesheet">
</head>
<body>
    <div class="login__wrapper install">
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
                            <h1 class="login_form__title h1_title" data-v-fade-in>Вход в систему</h1>
                            <div data-v-fade-in class="login_form__inner">
                                <div>
                                    <div role="alert" style="display:none" class="alert__block animate__animated animate__bounce active">
                                        <span class="alert__icon"></span>
                                        <span role="alert" class="alert__text">Неправильный логин или пароль.</span>
                                        <span class="alert__close"></span>
                                    </div>
                                </div>
                                <form id="form_login" class="loginForm">
                                    <div>
                                        <div id="err_login" class="email row-form">
                                            <label for="email" class="input-title">Логин</label>
                                            <div class="email-input">
                                                <input type="text" id="auth_login" placeholder="Введите свой логин" class="form-control">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="password">
                                        <div class="row-form">
                                        <label for="password" data-test="password-label" class="input-title">
                                            <span>Пароль</span>
                                            <a href="https://multibank.uz/oauth/forgotpassword" class="forgot_pass">Не могу войти</a>
                                        </label>
                                        <div id="err_email">
                                            <div class="password-input" data-pass>
                                                <input id="auth_password" placeholder="Введите свой пароль" type="password" class="form-control">
                                                <span class="icon-eye"></span>
                                            </div>
                                        </div>
                                        </div>
                                    </div>
                                    <button type="submit" id="submit_btn" class="button">
                                        <span class="button-submit">Войти</span>
                                        <span class="disable_loading"></span>
                                    </button>
                                </form>
                                <form id="form_install" class="loginForm" style="display:none">
                                    <button type="submit" id="install_btn" class="button">
                                        <span class="button-submit">Установить</span>
                                        <span class="disable_loading"></span>
                                    </button>
                                </form>
                                <div class="other_methods">
                                    <a href="/oauth/forgotpassword" class="forgot_pass_bottom">Не могу войти</a>
                                    <div class="registration_block">
                                        <p class="registration">Впервые в системе? </p>
                                        <a href="https://multibank.uz/oauth/register" class="registration_link">Зарегистрироваться бесплатно</a>
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
        <script src="//api.bitrix24.com/api/v1/"></script>
        <script src="https://micros.uz/it/solutions_our/multicheck.app/scripts/jquery.js"></script>
        <script src="https://micros.uz/it/solutions_our/multicheck.app/scripts/install.min.js"></script>
</body>
</html>