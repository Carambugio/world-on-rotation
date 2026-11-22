<?php
/**
 * All country guides.
 */
get_header();
if ( wort_need_plugin() ) :
	$wort_d = wor_data();
	?>
<div class="intro-block"><p class="eyebrow">Country guides</p><h1>Countries</h1><p class="lede">The music of a whole country: its regions and traditions, key eras and labels, its diaspora, the scene now, where to dig and records to start with.</p></div>
<div class="cards">
	<?php foreach ( $wort_d['CGUIDE'] as $wort_n => $wort_g ) : ?>
	<a class="card" href="<?php echo esc_url( $wort_g['url'] ); ?>"><span><strong><?php echo esc_html( $wort_n ); ?></strong><small>Country guide</small></span></a>
	<?php endforeach; ?>
</div>
	<?php
endif;
get_footer();
