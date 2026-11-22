<?php
/**
 * Not found.
 */
get_header();
?>
<div class="intro-block">
	<p class="eyebrow">Passport control</p>
	<h1>Lost in transit</h1>
	<p class="lede">This page does not exist, or it has moved. Try the globe or the list of places.</p>
	<p class="actions"><a class="btn primary" href="<?php echo esc_url( home_url( '/' ) ); ?>">Open the globe</a><a class="btn" href="<?php echo esc_url( home_url( '/places/' ) ); ?>">Places</a><a class="btn" href="<?php echo esc_url( home_url( '/countries/' ) ); ?>">Countries</a></p>
</div>
<?php
get_footer();
