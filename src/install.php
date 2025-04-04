<?php
require_once (__DIR__.'/crest.php');

$result = CRest::installApp();
if($result['rest_only'] === false):?>
	<? echo "установлен"; ?>
<?php endif;